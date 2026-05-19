"""LLM-based fallback chapter detector.

When the heuristic chapter splitter in `parsers.py` produces a suspicious
result for a TXT or PDF (e.g. one giant 200,000-char "chapter", or 50 chapters
of 30 chars each because some line numbers got matched as headings), this
module asks MiniMax to identify real chapter-heading lines.

Design rationale (read this before changing things):

  - We do NOT have the LLM rewrite the prose. We only ask it to point at
    line numbers it considers chapter starts. That keeps cost low, lets us
    process long novels chunk-by-chunk, and means the original text is
    preserved byte-for-byte.
  - We chunk by line range (~600 lines / ~30 KB per chunk) with a small
    overlap so a heading that straddles a boundary is still seen by both
    chunks; we de-duplicate by line number afterwards.
  - We pass line numbers explicitly into the prompt as `[L<n>]` prefixes
    so the model can quote them back unambiguously.

Public API:

    is_suspicious(chapters, total_chars)  -> bool
    LLMChapterDetector(config).detect(full_text) -> List[Tuple[title, body]]
"""
from __future__ import annotations

import json
import re
import statistics
from typing import List, Optional, Tuple

from anthropic import Anthropic

from config import Config
from models import Chapter


# --------------------------------------------------------------------------- heuristics

# Tuned to be deliberately conservative — we only want to escalate to the LLM
# when the regex splitter has clearly failed, not on every short story.
_MIN_BOOK_CHARS_FOR_LLM = 6_000          # below this, one chapter is fine
_SUSPICIOUS_SINGLE_CHAPTER_CHARS = 15_000  # one chapter this big => likely missed splits
_SUSPICIOUS_MEDIAN_CHAPTER_CHARS = 60_000  # median chapter this big => too coarse
_SUSPICIOUS_TINY_CHAPTER_CHARS = 80        # any "chapter" this small => fake headings
_SUSPICIOUS_TINY_RATIO = 0.3               # >30% of chapters being tiny => garbage


def is_suspicious(chapters: List[Chapter], total_chars: int) -> Tuple[bool, str]:
    """Return (is_suspicious, reason). Reason is for logging only."""
    if total_chars < _MIN_BOOK_CHARS_FOR_LLM:
        return False, "text too short to bother"

    if len(chapters) == 0:
        return True, "parser produced zero chapters"

    if len(chapters) == 1:
        if len(chapters[0].content) > _SUSPICIOUS_SINGLE_CHAPTER_CHARS:
            return True, (
                f"only 1 chapter detected but it is {len(chapters[0].content):,} chars — "
                f"headings probably missed"
            )
        return False, "single short chapter — accept"

    lengths = [len(c.content) for c in chapters]
    tiny = sum(1 for L in lengths if L < _SUSPICIOUS_TINY_CHAPTER_CHARS)
    if tiny / len(chapters) > _SUSPICIOUS_TINY_RATIO:
        return True, (
            f"{tiny}/{len(chapters)} chapters are < {_SUSPICIOUS_TINY_CHAPTER_CHARS} chars "
            f"— headings likely false positives"
        )

    median = statistics.median(lengths)
    if median > _SUSPICIOUS_MEDIAN_CHAPTER_CHARS:
        return True, (
            f"median chapter is {median:,.0f} chars — splits probably too coarse"
        )

    return False, "looks fine"


# --------------------------------------------------------------------------- LLM detector

_DETECTOR_SYSTEM = """You are a precise document structure analyst.

You are given a slice of a novel as a list of numbered lines like:

  [L42] 第一章 风起
  [L43]    天色阴沉，远处雷声...
  [L44] ...

Your job: identify which line numbers are CHAPTER HEADINGS — lines that
begin a new chapter, prologue, epilogue, interlude, or part. Be conservative:

  - A chapter heading is usually short (under ~40 characters), often centered
    or on its own line, and announces a new chapter (e.g. "Chapter 3", "第三章",
    "第三章 红色的雪", "Prologue", "Part Two: The Long Night", "序章",
    "尾声", "Interlude").
  - Do NOT mark scene-break dividers like "* * *" or "---" as chapter headings.
  - Do NOT mark in-prose section labels (e.g. "she walked into chapter 3 of
    her life") — only standalone heading lines.
  - Do NOT mark table-of-contents lines (they cluster densely at the top of
    the document with no prose between them).
  - It is acceptable to return zero headings if the slice has no real
    chapter breaks.

Output STRICT JSON, no markdown, no commentary. Schema:

{
  "headings": [
    {"line": <int>, "title": "<the heading text, trimmed>"}
  ]
}
"""


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```\s*$", "", text)
    start = text.find("{")
    if start == -1:
        raise ValueError(f"No JSON object in: {text[:200]}")
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        c = text[i]
        if esc:
            esc = False
            continue
        if c == "\\" and in_str:
            esc = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("Unbalanced JSON in LLM response")


class LLMChapterDetector:
    """Asks MiniMax to point at chapter-heading line numbers in long text.

    Usage:
        detector = LLMChapterDetector(config)
        chapters = detector.detect(full_text)   # -> List[Tuple[title, body]]
    """

    # Tuned so a single chunk fits comfortably in the model's context with the
    # numbered prefixes — change cautiously, smaller chunks => more API calls.
    CHUNK_LINES = 600
    OVERLAP_LINES = 60

    def __init__(self, config: Config):
        self.config = config
        self.client = Anthropic(
            api_key=config.minimax_text_key,
            base_url="https://api.minimax.io/anthropic",
        )

    # ----------------------------- public ---------------------------------

    def detect(self, full_text: str) -> List[Tuple[str, str]]:
        """Return (title, body) tuples. If the LLM finds nothing usable, falls
        back to a single chapter so the pipeline keeps going."""
        lines = full_text.splitlines()
        if not lines:
            return [("全文", full_text.strip())]

        headings = self._scan_all_chunks(lines)

        # If LLM also found nothing, fall back gracefully.
        if not headings:
            return [("全文", full_text.strip())]

        # Sort + de-dup by line number, drop adjacent duplicates (overlap region).
        headings.sort(key=lambda h: h["line"])
        deduped: List[dict] = []
        for h in headings:
            if deduped and h["line"] - deduped[-1]["line"] < 2:
                # Same heading caught twice across overlap, keep the longer title.
                if len(h["title"]) > len(deduped[-1]["title"]):
                    deduped[-1] = h
                continue
            deduped.append(h)

        # Build (title, body) tuples by slicing the original lines.
        chapters: List[Tuple[str, str]] = []
        for idx, h in enumerate(deduped):
            start = h["line"]
            end = deduped[idx + 1]["line"] if idx + 1 < len(deduped) else len(lines)
            body = "\n".join(lines[start + 1 : end]).strip()
            if len(body) < 10:
                continue
            title = h["title"].strip() or f"Chapter {idx + 1}"
            chapters.append((title, body))

        if not chapters:
            return [("全文", full_text.strip())]
        return chapters

    # ----------------------------- internals ------------------------------

    def _scan_all_chunks(self, lines: List[str]) -> List[dict]:
        all_headings: List[dict] = []
        n = len(lines)
        start = 0
        step = self.CHUNK_LINES - self.OVERLAP_LINES
        while start < n:
            end = min(start + self.CHUNK_LINES, n)
            chunk_headings = self._scan_chunk(lines, start, end)
            all_headings.extend(chunk_headings)
            if end == n:
                break
            start += step
        return all_headings

    def _scan_chunk(self, lines: List[str], start: int, end: int) -> List[dict]:
        # Number the chunk's lines so the model can refer to them unambiguously.
        # Truncate very long lines — chapter headings are short, prose detail
        # doesn't help here and just eats tokens.
        numbered = []
        for i in range(start, end):
            line = lines[i]
            if len(line) > 200:
                line = line[:200] + "…"
            numbered.append(f"[L{i}] {line}")
        user = (
            "Slice of the document (line numbers are absolute, not chunk-local):\n\n"
            + "\n".join(numbered)
            + "\n\nReturn the JSON now."
        )
        try:
            resp = self.client.messages.create(
                model=self.config.minimax_model,
                max_tokens=2000,
                system=_DETECTOR_SYSTEM,
                messages=[{"role": "user", "content": user}],
            )
            raw = "".join(b.text for b in resp.content if b.type == "text")
            data = _extract_json(raw)
        except Exception as e:
            print(f"  [章节探测] chunk {start}-{end} 调用失败，跳过: {e}")
            return []

        out: List[dict] = []
        for h in data.get("headings", []):
            try:
                line_no = int(h["line"])
            except (KeyError, ValueError, TypeError):
                continue
            if not (start <= line_no < end):
                # Model hallucinated a line number outside the chunk — skip.
                continue
            # Sanity: re-read the line from source. If the model invented a
            # title that doesn't match the actual line text at all, trust the
            # source line (truncated) instead.
            raw_line = lines[line_no].strip()
            title = (h.get("title") or "").strip()
            if not title or len(title) > 80:
                title = raw_line[:80] if raw_line else f"Chapter @ L{line_no}"
            out.append({"line": line_no, "title": title})
        return out
