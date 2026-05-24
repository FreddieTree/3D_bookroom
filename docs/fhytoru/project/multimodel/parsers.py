"""Document parsers — handle epub / pdf / txt and split into chapters.

Public entry point:  parse_book(path) -> Book

Format is auto-detected from file extension. Each parser is responsible
for extracting clean text and a sensible chapter split.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import List, Tuple

from bs4 import BeautifulSoup
from ebooklib import epub, ITEM_DOCUMENT

from models import Book, Chapter


# Chapter heading patterns covering Chinese, English and numbered formats.
# Anchored to start of line. Order matters: most-specific first.
_CHAPTER_PATTERNS = [
    re.compile(r'^\s*第\s*[一二三四五六七八九十百千万零〇两\d]+\s*[章回卷节篇][\s　]*\S.*$'),
    re.compile(r'^\s*Chapter\s+[IVXLCDM\d]+\b.*$', re.IGNORECASE),
    re.compile(r'^\s*Prologue\b.*$', re.IGNORECASE),
    re.compile(r'^\s*Epilogue\b.*$', re.IGNORECASE),
    re.compile(r'^\s*序章\b.*$'),
    re.compile(r'^\s*尾声\b.*$'),
    re.compile(r'^\s*终章\b.*$'),
    # Numbered-only headings like "1." or "01" on their own line — last resort.
    re.compile(r'^\s*\d{1,3}\.\s*\S.*$'),
]


def _looks_like_chapter_heading(line: str) -> bool:
    line = line.strip()
    if not line or len(line) > 80:
        return False
    return any(p.match(line) for p in _CHAPTER_PATTERNS)


def _split_text_into_chapters(text: str) -> List[Tuple[str, str]]:
    """Return list of (title, content) tuples. Falls back to a single chapter
    if no headings detected."""
    lines = text.splitlines()
    heading_indices: List[int] = []
    for i, line in enumerate(lines):
        if _looks_like_chapter_heading(line):
            heading_indices.append(i)

    if not heading_indices:
        # No detectable chapter markers — treat whole text as one chapter
        return [("全文", text.strip())]

    # Anything before the first heading is preamble; we drop it (usually copyright / TOC).
    chapters: List[Tuple[str, str]] = []
    for idx, start in enumerate(heading_indices):
        title = lines[start].strip()
        end = heading_indices[idx + 1] if idx + 1 < len(heading_indices) else len(lines)
        body = "\n".join(lines[start + 1:end]).strip()
        # Filter out chapter shells with NO real content (TOC entries / blank entries).
        # Real chapters may be short interludes, so be permissive.
        if len(body) < 10:
            continue
        chapters.append((title, body))

    if not chapters:
        return [("全文", text.strip())]
    return chapters


# --------------------------------------------------------------------------- EPUB

def _parse_epub(path: Path) -> Book:
    book = epub.read_epub(str(path))

    title = "Untitled"
    author = None
    try:
        meta_titles = book.get_metadata("DC", "title")
        if meta_titles:
            title = meta_titles[0][0]
        meta_authors = book.get_metadata("DC", "creator")
        if meta_authors:
            author = meta_authors[0][0]
    except Exception:
        pass

    chapters: List[Chapter] = []
    for i, item in enumerate(book.get_items_of_type(ITEM_DOCUMENT)):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        # Remove scripts/styles
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        if len(text) < 100:
            continue  # likely a TOC / nav / blank doc

        # Try to find a heading inside the document for the title.
        ch_title = None
        for tag_name in ("h1", "h2", "h3", "title"):
            tag = soup.find(tag_name)
            if tag and tag.get_text(strip=True):
                ch_title = tag.get_text(strip=True)
                break
        if not ch_title:
            ch_title = item.get_name() or f"Chapter {len(chapters) + 1}"

        chapters.append(Chapter(
            index=len(chapters),
            title=ch_title,
            content=text,
            word_count=_count_words(text),
        ))

    # Some epubs glue everything into one big xhtml — re-split by heading patterns
    if len(chapters) <= 2 and chapters and len(chapters[0].content) > 20_000:
        merged = "\n\n".join(c.content for c in chapters)
        splits = _split_text_into_chapters(merged)
        if len(splits) > len(chapters):
            chapters = [
                Chapter(index=i, title=t, content=c, word_count=_count_words(c))
                for i, (t, c) in enumerate(splits)
            ]

    return Book(
        title=title,
        author=author,
        source_path=str(path),
        source_format="epub",
        chapters=chapters,
    )


# --------------------------------------------------------------------------- PDF

def _parse_pdf(path: Path) -> Book:
    # pdfplumber handles layout-aware text extraction better than pypdf for prose.
    import pdfplumber

    pages: List[str] = []
    pdf_title = path.stem
    pdf_author = None
    with pdfplumber.open(str(path)) as pdf:
        meta = pdf.metadata or {}
        pdf_title = meta.get("Title") or pdf_title
        pdf_author = meta.get("Author")
        for page in pdf.pages:
            try:
                txt = page.extract_text() or ""
            except Exception:
                txt = ""
            pages.append(txt)

    full_text = "\n\n".join(pages)
    # Clean common PDF artefacts: hyphenated line-breaks, repeated whitespace, page numbers.
    full_text = re.sub(r"-\n(\w)", r"\1", full_text)             # join hyphenated wraps
    full_text = re.sub(r"\n{3,}", "\n\n", full_text)
    full_text = re.sub(r"^\s*\d+\s*$", "", full_text, flags=re.M)  # lone page numbers

    splits = _split_text_into_chapters(full_text)
    chapters = [
        Chapter(index=i, title=t, content=c, word_count=_count_words(c))
        for i, (t, c) in enumerate(splits)
    ]
    return Book(
        title=pdf_title,
        author=pdf_author,
        source_path=str(path),
        source_format="pdf",
        chapters=chapters,
        raw_full_text=full_text,
    )


# --------------------------------------------------------------------------- TXT

def _parse_txt(path: Path) -> Book:
    # Try a few common encodings; novels are often gb18030 on Chinese sites.
    raw_bytes = path.read_bytes()
    text = None
    for enc in ("utf-8", "utf-8-sig", "gb18030", "big5", "shift_jis", "latin-1"):
        try:
            text = raw_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw_bytes.decode("utf-8", errors="replace")

    # Many Chinese novels use full-width spaces for indent and \r\n endings.
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    splits = _split_text_into_chapters(text)
    chapters = [
        Chapter(index=i, title=t, content=c, word_count=_count_words(c))
        for i, (t, c) in enumerate(splits)
    ]
    return Book(
        title=path.stem,
        author=None,
        source_path=str(path),
        source_format="txt",
        chapters=chapters,
        raw_full_text=text,
    )


# --------------------------------------------------------------------------- common

def _count_words(text: str) -> int:
    """Approximate word count that works for both CJK and Latin text."""
    # Count CJK chars individually + Latin words.
    cjk = re.findall(r"[\u4e00-\u9fff\u3400-\u4dbf]", text)
    latin = re.findall(r"[A-Za-z]+", text)
    return len(cjk) + len(latin)


def parse_book(path: str | Path) -> Book:
    """Auto-detect format from extension and parse into a Book."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(p)
    ext = p.suffix.lower()
    if ext == ".epub":
        return _parse_epub(p)
    if ext == ".pdf":
        return _parse_pdf(p)
    if ext in {".txt", ".md"}:
        return _parse_txt(p)
    raise ValueError(f"Unsupported file format: {ext}. Supported: .epub .pdf .txt")
