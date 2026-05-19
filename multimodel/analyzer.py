"""Story & chapter analyzers powered by Claude.

Two stages:

  StoryAnalyzer.analyze(book) -> StoryProfile
      Reads the whole novel, distils the global style document used to
      keep everything consistent: art_style, music_baseline, character
      voice profiles.

  ChapterAnalyzer.plan(chapter, profile) -> ChapterPlan
      Reads a single chapter *in the context of* the global profile and
      decides what scene to illustrate, which dialogues to voice-act,
      and the chapter-specific music mood delta.

Both stages use Claude's JSON-mode-ish strategy: we instruct the model
to return a strict JSON object, extract the first {...} block, and
validate it with pydantic.
"""
from __future__ import annotations

import json
import re
from typing import Optional
from openai import OpenAI
from anthropic import Anthropic

from config import Config
from models import Book, Chapter, ChapterPlan, StoryProfile, Character, DialogueLine


_STORY_ANALYZER_SYSTEM = """You are a master story analyst and creative director.

You read a full novel and produce a STYLE BIBLE that downstream image,
voice, and music generators will use to enrich the book. Consistency
across the whole book matters more than chapter-level cleverness — the
art_style and music_baseline you specify will be re-used VERBATIM for
every chapter, so they must be specific, evocative, and stable.

Hard requirements:

1. art_style (single rich paragraph, ~80–140 words). Must concretely
   specify ALL of:
     • medium — e.g. "cinematic concept art", "oil-on-canvas painterly",
       "ink wash with subtle watercolor", "matte digital painting".
     • palette — name 3–5 anchor colors (e.g. "burnt sienna, indigo, ivory,
       cold lichen green"). Avoid vague words like "moody".
     • lighting — direction, hardness, time-of-day tendency
       (e.g. "low-angle dusk sun, long shadows, rim light on figures").
     • rendering — brushwork / line / texture
       (e.g. "loose painterly edges, visible brush direction, no airbrush gloss").
     • composition tendency — framing, depth, scale of subject in frame
       (e.g. "wide cinematic framing, subject small against landscape,
       strong negative space").
     • 1–2 concrete artist or film references that anchor the style
       (e.g. "in the spirit of Eyvind Earle backgrounds and Studio Ghibli
       background paintings"). Avoid generic "trending on artstation".
   No vague words: "beautiful", "amazing", "stunning" are forbidden.

2. art_style_negative: a comma-separated list of exclusions. Always include
   "no on-image text, no captions, no watermarks, no logos, no UI elements,
   no signatures, no anachronistic modern objects". Add genre-appropriate
   exclusions (e.g. for historical fiction: "no plastic, no neon").

3. music_baseline (single paragraph, ~60–100 words). Must specify:
     • instrumentation — name 3–6 specific instruments / textures
       (e.g. "felt piano, low bowed strings, soft analog pad, gentle wood
       percussion, distant choir hummed (no words)").
     • BPM range — narrow, e.g. "60–72 BPM".
     • key / mode — e.g. "D minor, dorian flavor" or "C# phrygian".
     • dynamics envelope — "low to medium-low throughout, no swells past
       mf, no climactic builds, no drops, no rhythmic percussion stings".
     • role — explicitly "instrumental underscore for reading, fully
       loopable, must not pull attention from prose".
   No vocals with lyrics. No EDM, no trap, no drops, no big builds.

4. characters: list every named speaking character that meaningfully
   appears. For each:
     • voice_description must be tight enough for a casting director:
       gender, age band, pitch range, pace, accent/dialect, vocal timbre
       (e.g. "warm low-mid alto, mid-30s, measured pace, faint Edinburgh
       lilt, slightly smoky timbre, wry rather than warm").
     • appearance: a 1–2 sentence physical description used to render a
       reference portrait. Face shape, skin tone, eye colour, hair
       (length/colour/style), build, signature clothing or accessories.
       Must be era-appropriate (e.g. for ancient Chinese palace fiction:
       hanfu / qipao, hair ornaments, jade — not modern clothes). If the
       book is vague on a character's looks, infer plausible details from
       their role and the setting; do NOT leave this blank.
     • aliases: every nickname / honorific / surname-only form the book
       uses for this person, so the same character maps to one voice.
     • Skip walk-on characters with under ~3 lines unless they're
       structurally important.

5. Output ONE JSON object only, no markdown fences, no commentary. Schema:

{
  "title": string,
  "author": string | null,
  "genre": string,
  "tone": string,
  "setting": string,
  "summary": string,
  "art_style": string,
  "art_style_negative": string,
  "music_baseline": string,
  "characters": [
    {
      "name": string,
      "aliases": [string],
      "gender": "male" | "female" | "neutral" | "unknown",
      "age_group": "child" | "teen" | "young_adult" | "adult" | "elder",
      "description": string,
      "appearance": string,
      "voice_description": string
    }
  ]
}
"""


_CHAPTER_ANALYZER_SYSTEM_TEMPLATE = """You are planning multimodal enrichment for ONE chapter
of a novel. You will receive the global STYLE BIBLE for the book and
the chapter's text. You produce a plan in strict JSON.

═══════════════════════ IMAGE ═══════════════════════

{image_mode_directive}

1. image_focus — ONE concrete subject in one sentence. Pick either:
     (a) the chapter's most visually striking dramatic beat (a moment a
         reader would screenshot if this were a film), OR
     (b) if there is no clear dramatic beat, the defining environment
         that anchors this chapter.
   Avoid generic options ("a character looking thoughtful") unless that
   really is the chapter's defining image. Be specific to THIS chapter.

2. image_scene_details — cinematic shot description, ~60–120 words.
   You MUST cover, in roughly this order:
     • Subject(s): named characters from the style bible if present,
       their pose, gesture, facial expression, gaze direction, distance
       from camera.
     • Setting: location, era-appropriate objects, foreground / midground
       / background elements.
     • Lighting: source (sun, candles, neon, overcast sky), direction,
       quality (hard/soft), time of day, color temperature.
     • Weather / atmosphere: clear, mist, rain, snow, smoke, dust motes.
     • Camera framing: shot size (close-up, medium, wide, extreme-wide),
       angle (eye-level, low-angle, high-angle, Dutch tilt), focal hint
       (shallow depth-of-field, deep focus). Pick a framing that
       reinforces the emotional beat — wide for awe/isolation, close for
       intimacy, low-angle for menace/power.
     • Mood-carrying details: 1–2 small specific objects or textures
       that ground the moment (e.g. "an overturned teacup, still
       steaming", "frayed thread on a sleeve cuff").
   Do NOT describe art style, palette, brushwork, or medium here — those
   come from the global art_style and will be applied separately. Pure
   content only.

3. image_has_people — true if image_scene_details depicts any human
   figure(s); false for pure environment / still-life / object shots.

4. image_characters — if image_has_people is true, list the CANONICAL
   names (matching the style bible) of characters appearing in the image,
   in order of visual prominence. Use [] if image_has_people is false or
   if the people are unnamed background figures.

═══════════════════════ MUSIC ═══════════════════════

5. music_mood — a SMALL delta on top of the global baseline. ~15–30 words.
   The baseline is already loopable, instrumental, and low-intensity;
   you only nudge it. Examples of good deltas:
     • "slightly warmer; add muted brass pad, hint of nostalgia, very
       gentle bell motif"
     • "a touch more tense; thin out the strings, add sparse low piano
       notes, leave more silence between phrases"
   FORBIDDEN: requests for "epic", "climactic", "intense", "driving
   percussion", "build-up", "drop", "energetic", or "high tempo". The
   underscore must never compete with the prose.

═══════════════════════ DIALOGUE ═══════════════════════

6. key_dialogues — up to 5 lines that are worth voice-acting. SELECTION
   RULES, applied in order:
     a. The speaker must be a character listed in the style bible (or
        match one of their aliases). Skip narrator lines, skip unnamed
        speakers.
     b. Prefer lines that: reveal character, advance plot, deliver a
        memorable image, or carry a clear emotional charge.
     c. Reject lines under ~6 words unless they are a deliberately
        loaded short line ("Don't.", "She's gone."). Never include
        single-word back-channel grunts ("Hm.", "Yeah.", "OK.").
     d. If two lines are part of one exchange, prefer the one with
        higher emotional weight — don't waste a slot on the prompt
        line and the reply line both, unless both are heavy.
     e. Use the canonical character name from the style bible, not the
        alias the line happens to use in this chapter.
     f. Text must be the dialogue itself, no narrative tags, no quotes
        around it, no "he said". One line of speech per entry.
     g. If a chapter has no real dialogue, return an empty list.

7. emotion — exactly ONE of this WHITELIST (do not invent others):
     neutral, angry, tender, fearful, sad, joyful, wry, desperate, awed
   Map ambiguous moods to the closest one. The downstream TTS only has
   prosody settings for these nine.

═══════════════════════ OUTPUT ═══════════════════════

Output ONE JSON object only. No markdown fences. No commentary. Schema:

{{
  "chapter_summary": string,
  "image_focus": string,
  "image_scene_details": string,
  "image_has_people": boolean,
  "image_characters": [string],
  "music_mood": string,
  "key_dialogues": [
    {{"character": string, "text": string, "emotion": string}}
  ]
}}
"""


# Two variants of the directive, chosen based on user preference.
_IMAGE_MODE_PEOPLE_OK = (
    "IMAGE-MODE: People are allowed in the image. If the chapter's "
    "defining beat naturally features named characters, depict them. "
    "Otherwise, an environment / object shot is fine."
)
_IMAGE_MODE_NO_PEOPLE = (
    "IMAGE-MODE: STRICTLY NO PEOPLE OR FIGURES. The user has chosen "
    "environment-only illustrations. You MUST pick an environment, "
    "still-life, or object shot. Do NOT depict any human figure, face, "
    "silhouette, or implied person — even in the background. "
    "image_has_people MUST be false. image_characters MUST be []. "
    "If the chapter is dominated by a dramatic interpersonal beat, pick "
    "an empty location, object, or aftermath that evokes the same mood "
    "without showing anyone."
)


def _extract_json_object(text: str) -> dict:
    """Pull the first balanced {...} block from a model response and parse it.

    Tolerates:
      - leading prose or stray code fences (strip them)
      - **truncated** JSON at the tail (e.g. LLM hit max_tokens mid-output)
        — we attempt to repair by closing dangling strings / arrays /
        objects before parsing.
    """
    # Strip code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```\s*$", "", text)
    # Find first { and balance braces (rough, but works for well-formed JSON)
    start = text.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found in response: {text[:200]}")
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
                return json.loads(text[start:i + 1])

    # Got here = JSON was truncated. Try to repair: close any open string,
    # then close any open arrays/objects in LIFO order. We track the
    # bracket stack as we scan.
    repaired = _try_repair_truncated_json(text[start:])
    if repaired is not None:
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass
    raise ValueError(
        "Unbalanced JSON in response — model output was likely truncated by "
        "max_tokens. Try raising config.minimax_text_max_tokens."
    )


def _try_repair_truncated_json(text: str) -> Optional[str]:
    """Best-effort: walk the text, track bracket stack + string state,
    and append the closers needed to make it parse. Removes a dangling
    trailing comma if one exists right before the close. Returns None on
    structural problems we can't fix.

    Heuristic, not exhaustive — designed for the common case of an LLM
    cut off mid-field. Will produce slightly-lossy but parseable JSON
    (the half-written final field gets discarded if necessary).
    """
    stack: list = []           # entries: '{' or '['
    in_str = False
    esc = False
    last_safe = 0              # index after the last complete element
    for i, c in enumerate(text):
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
        if c in "{[":
            stack.append(c)
        elif c in "}]":
            if not stack:
                return None  # extra closer, give up
            stack.pop()
            if not stack:
                # Shouldn't normally hit this in the truncated case.
                last_safe = i + 1
        elif c == "," and stack:
            # Comma at top-level of current container ends an element.
            last_safe = i + 1

    # Trim back to the last complete element to avoid a half-written field.
    trimmed = text[:last_safe].rstrip().rstrip(",")
    # Recompute stack against the trimmed prefix.
    stack = []
    in_str = False
    esc = False
    for c in trimmed:
        if esc:
            esc = False; continue
        if c == "\\" and in_str:
            esc = True; continue
        if c == '"':
            in_str = not in_str; continue
        if in_str:
            continue
        if c in "{[":
            stack.append(c)
        elif c in "}]":
            if stack:
                stack.pop()
    if in_str:
        # Still inside a string — close it and the surrounding container.
        trimmed += '"'
    closers = "".join("}" if b == "{" else "]" for b in reversed(stack))
    return trimmed + closers


class StoryAnalyzer:
    """Stage 1: reads full novel → StoryProfile."""

    def __init__(self, config: Config):
        self.config = config
        self.client = Anthropic(
            api_key=config.minimax_text_key,
            base_url="https://api.minimax.io/anthropic"  # ← 将这里的网址改成这个
        )

    def analyze(self, book: Book) -> StoryProfile:
        text = book.full_text
        # If the book is enormous, do a map-reduce summary pass first.
        if len(text) > self.config.long_novel_threshold_chars:
            text = self._compress_long_novel(book)

        user_msg = (
            f"BOOK TITLE: {book.title}\n"
            f"AUTHOR: {book.author or 'Unknown'}\n"
            f"CHAPTERS: {len(book.chapters)}\n"
            f"--- BEGIN BOOK ---\n{text}\n--- END BOOK ---\n\n"
            "Produce the STYLE BIBLE JSON now."
        )

        resp = self.client.messages.create(
            model=self.config.minimax_model,
            max_tokens=self.config.minimax_text_max_tokens,
            system=_STORY_ANALYZER_SYSTEM,
            messages=[{"role": "user", "content": user_msg}]
        )
        raw = "".join([block.text for block in resp.content if block.type == "text"])
        data = _extract_json_object(raw)
        # Fill in title if model omitted it
        data.setdefault("title", book.title)
        data.setdefault("author", book.author)

        # ---- HARD CONSTRAINT: music must be loopable / non-intense /
        # background-friendly / instrumental. Scrub the LLM's output here,
        # before it gets persisted into story_profile.json (where it would
        # otherwise contaminate every subsequent chapter's music_mood
        # prompt for the rest of the run).
        from generators import sanitize_music_baseline
        original_baseline = data.get("music_baseline", "")
        clean_baseline, violations = sanitize_music_baseline(original_baseline)
        if violations:
            print(
                f"   ⚠️  StoryAnalyzer 产出的 music_baseline 含违禁元素 {violations}\n"
                f"      已替换为符合 hard-constraint 的安全模板，原文已丢弃。"
            )
            data["music_baseline"] = clean_baseline

        return StoryProfile.model_validate(data)

    def _compress_long_novel(self, book: Book) -> str:
        summaries = []
        for ch in book.chapters:
            resp = self.client.messages.create(
                model=self.config.minimax_model,
                max_tokens=600,
                system=(
                    "Summarise the chapter in 6-10 sentences. Preserve "
                    "named characters, key dialogue tone, mood, and any "
                    "notable visual environments. No commentary."
                ),
                messages=[{
                    "role": "user",
                    "content": f"=== {ch.title} ===\n{ch.content}",
                }],
            )
            ch_text = "".join([block.text for block in resp.content if block.type == "text"])
            summaries.append(f"=== {ch.title} ===\n{ch_text}")
        return "\n\n".join(summaries)


class ChapterAnalyzer:
    """Stage 2: per-chapter planning, conditioned on the global StoryProfile."""

    def __init__(self, config: Config):
        self.config = config
        self.client = Anthropic(
            api_key=config.minimax_text_key,
            base_url="https://api.minimax.io/anthropic"  # ← 将这里的网址改成这个
        )

    def plan(self, chapter: Chapter, profile: StoryProfile) -> ChapterPlan:
        # The style bible is compressed to the parts the chapter analyzer needs.
        bible = {
            "title": profile.title,
            "genre": profile.genre,
            "tone": profile.tone,
            "art_style": profile.art_style,
            "music_baseline": profile.music_baseline,
            "characters": [
                {"name": c.name, "aliases": c.aliases, "description": c.description}
                for c in profile.characters
            ],
        }
        user_msg = (
            f"STYLE BIBLE:\n{json.dumps(bible, ensure_ascii=False, indent=2)}\n\n"
            f"CHAPTER {chapter.index + 1}: {chapter.title}\n"
            f"--- BEGIN CHAPTER ---\n{chapter.content}\n--- END CHAPTER ---\n\n"
            f"Plan the multimodal enrichment for this chapter. "
            f"At most {self.config.max_dialogues_per_chapter} dialogues."
        )

        resp = self.client.messages.create(
            model=self.config.minimax_model,
            max_tokens=self.config.minimax_text_max_tokens,
            system=self._build_system_prompt(),
            messages=[{"role": "user", "content": user_msg}]
        )
        raw = "".join([block.text for block in resp.content if block.type == "text"])
        data = _extract_json_object(raw)
        data["chapter_index"] = chapter.index
        data["chapter_title"] = chapter.title

        known_canonical = {c.name for c in profile.characters}
        known_any = known_canonical | {
            alias for c in profile.characters for alias in c.aliases
        }

        # Cap dialogues defensively
        if "key_dialogues" in data:
            data["key_dialogues"] = data["key_dialogues"][: self.config.max_dialogues_per_chapter]
        # Drop dialogues whose speaker isn't in the profile (helps avoid hallucinated minor NPCs)
        if known_any and "key_dialogues" in data:
            data["key_dialogues"] = [
                d for d in data["key_dialogues"]
                if d.get("character") in known_any
            ]
        # Sanitise emotion tags against the TTS prosody whitelist. Anything
        # the model invented outside this list collapses to 'neutral' so the
        # voice generator doesn't fall through to a worse default silently.
        _EMOTION_WHITELIST = {
            "neutral", "angry", "tender", "fearful",
            "sad", "joyful", "wry", "desperate", "awed",
        }
        if "key_dialogues" in data:
            for d in data["key_dialogues"]:
                e = (d.get("emotion") or "").strip().lower()
                d["emotion"] = e if e in _EMOTION_WHITELIST else "neutral"

        # ---- HARD CONSTRAINT: music_mood must respect the global "loopable
        # / low-intensity / instrumental" contract. If the chapter analyzer
        # got carried away with words like "epic" or "climactic", scrub now
        # so the music generator never sees a violating delta.
        from generators import sanitize_music_mood
        original_mood = data.get("music_mood", "")
        clean_mood, violations = sanitize_music_mood(original_mood)
        if violations:
            print(
                f"   ⚠️  ch{chapter.index + 1} music_mood 含违禁词 {violations} — 已替换为安全 delta"
            )
            data["music_mood"] = clean_mood

        # Sanitise the people fields. If the user disabled people in scenes,
        # force-clear them even if the model ignored the directive. Otherwise,
        # keep only canonical names we recognise.
        if not self.config.include_people_in_scenes:
            data["image_has_people"] = False
            data["image_characters"] = []
        else:
            data["image_has_people"] = bool(data.get("image_has_people", False))
            raw_chars = data.get("image_characters") or []
            # Map aliases to canonical names; drop unknowns silently.
            alias_to_canon = {}
            for c in profile.characters:
                alias_to_canon[c.name] = c.name
                for a in c.aliases:
                    alias_to_canon[a] = c.name
            clean_chars = []
            for ch in raw_chars:
                if not isinstance(ch, str):
                    continue
                canon = alias_to_canon.get(ch)
                if canon and canon not in clean_chars:
                    clean_chars.append(canon)
            data["image_characters"] = clean_chars
            # If the model said "has people" but listed none, we trust the bool
            # and let the image generator render anonymous figures.

        return ChapterPlan.model_validate(data)

    def _build_system_prompt(self) -> str:
        directive = (
            _IMAGE_MODE_PEOPLE_OK
            if self.config.include_people_in_scenes
            else _IMAGE_MODE_NO_PEOPLE
        )
        return _CHAPTER_ANALYZER_SYSTEM_TEMPLATE.format(image_mode_directive=directive)

class MockStoryAnalyzer:
    def __init__(self, config):
        self.config = config

    def analyze(self, book) -> StoryProfile:
        print(f"  [Mock全局分析] 正在快速扫描书籍: {book.title}，正在生成虚拟风格档案...")
        return StoryProfile(
            title=book.title,
            author=book.author or "匿名作者",
            genre="科幻悬疑",
            tone="神秘且充满科技感",
            setting="一个存在于虚拟宇宙的数字图书馆",
            summary="这是一个为了测试自动化流水线而诞生的测试文本。",
            art_style="赛博朋克霓虹画风，高对比度冷色调，充满未来科技感",
            art_style_negative="纯文本，水印，糟糕的构图",
            music_baseline="低沉的电子合成器环境音，每分钟80拍，平静内敛",
            characters=[
                Character(
                    name="管理员",
                    aliases=["AI核心"],
                    description="负责看管书屋的虚拟实体",
                    appearance="身着银色长袍的人形全息投影，蓝色双眼，及肩白发，背景常有几何光纹",
                    voice_description="冷静沉稳的青年男声，语速适中"
                )
            ]
        )


class MockChapterAnalyzer:
    def __init__(self, config):
        self.config = config

    def plan(self, chapter, profile) -> ChapterPlan:
        print(f"  [Mock章节规划] 正在分析章节: {chapter.title}")
        return ChapterPlan(
            chapter_index=chapter.index,
            chapter_title=chapter.title,
            chapter_summary=f"这是关于 {chapter.title} 的自动化测试摘要。",
            image_focus="一个散发着蓝色微光的服务器机柜",
            image_scene_details="无数代码流在空中交织，背景是一片漆黑的数字空间",
            image_has_people=False,
            image_characters=[],
            music_mood="加入少许轻微的脉冲节奏，略带一丝紧张感",
            key_dialogues=[
                DialogueLine(character="管理员", text="欢迎来到三维书屋系统的测试环境。", emotion="neutral")
            ]
        )