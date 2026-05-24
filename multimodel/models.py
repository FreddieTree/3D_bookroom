"""Pydantic data models that flow through the pipeline.

These are the *contract* between stages: the StoryAnalyzer produces a
StoryProfile, the ChapterAnalyzer produces a ChapterPlan, and the
generators consume them. Keeping these strongly typed makes Claude's
JSON-mode outputs easy to validate and the downstream code easy to read.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class CharacterGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"
    UNKNOWN = "unknown"


class AgeGroup(str, Enum):
    CHILD = "child"
    TEEN = "teen"
    YOUNG_ADULT = "young_adult"
    ADULT = "adult"
    ELDER = "elder"
    UNKNOWN = "unknown"


class Character(BaseModel):
    """A speaking character. voice_id is assigned later by VoiceCaster."""
    name: str = Field(..., description="Canonical name used throughout the book")
    aliases: List[str] = Field(default_factory=list, description="Other names / nicknames")
    gender: CharacterGender = CharacterGender.UNKNOWN
    age_group: AgeGroup = AgeGroup.ADULT
    description: str = Field(..., description="Personality, role, and any vocally-relevant traits")
    appearance: str = Field(
        default="",
        description=(
            "Visual description used to render a reference portrait — face shape, "
            "skin tone, eye colour, hair (length/colour/style), build/height, "
            "signature clothing or accessories. Era-appropriate."
        ),
    )
    voice_description: str = Field(
        ...,
        description=(
            "Short directing note for the TTS voice — pitch, accent, pace, vibe. "
            "E.g. 'low gravelly male baritone, slow measured speech, world-weary'."
        ),
    )
    voice_id: Optional[str] = None  # filled in by VoiceCaster
    voice_name: Optional[str] = None  # human-readable name from voice provider
    # Public URL of a reference portrait image, generated once per character
    # so that subsequent chapter illustrations can pass it as
    # `subject_reference` to keep the character visually consistent.
    portrait_url: Optional[str] = None
    portrait_path: Optional[str] = None  # local relative path under the book dir


class StoryProfile(BaseModel):
    """Global style document produced once after reading the whole novel.
    Injected into every per-chapter generation prompt to enforce consistency."""
    title: str
    author: Optional[str] = None
    genre: str
    tone: str = Field(..., description="Overall emotional palette, e.g. 'melancholic and lyrical'")
    setting: str = Field(..., description="World/era/location in one rich sentence")
    summary: str = Field(..., description="2-3 sentence spoiler-free story summary")

    art_style: str = Field(
        ...,
        description=(
            "A very specific visual style description, used verbatim in every image prompt. "
            "Should cover: medium (e.g. 'cinematic concept art'), palette, lighting, "
            "rendering style, composition tendency, and stylistic exclusions. "
            "Long, specific, and stable."
        ),
    )
    art_style_negative: str = Field(
        default="",
        description="Things to avoid (anti-prompt). E.g. 'no text, no logos, no modern objects'.",
    )

    music_baseline: str = Field(
        ...,
        description=(
            "Used in every music prompt. Should specify: genre, instrumentation, BPM range, "
            "key/mode, energy level. Must always be instrumental, loopable, and low-intensity "
            "as per product spec."
        ),
    )

    characters: List[Character] = Field(default_factory=list)


class DialogueLine(BaseModel):
    """A single line of dialogue to be voice-acted."""
    character: str = Field(..., description="Must match a canonical name in StoryProfile.characters")
    text: str
    emotion: str = Field(
        default="neutral",
        description="Short emotion tag for prosody hint: 'angry', 'tender', 'fearful', etc.",
    )


class ChapterPlan(BaseModel):
    """Per-chapter generation plan from the ChapterAnalyzer."""
    chapter_index: int
    chapter_title: str
    chapter_summary: str = Field(..., description="2-3 sentence summary of this chapter")

    # Image: pick the single most visually compelling scene or environment.
    image_focus: str = Field(
        ...,
        description=(
            "What this image depicts — a key dramatic moment OR a defining environment "
            "shot. One concrete subject in one sentence."
        ),
    )
    image_scene_details: str = Field(
        ...,
        description=(
            "Concrete visual details to render: subjects' poses & expressions, lighting, "
            "weather, objects, framing. The chapter-specific complement to art_style. "
            "No style words here — only content."
        ),
    )
    # Whether the image features people / faces at all. Set False for pure
    # environment / object shots. Honors the user's --no-people preference.
    image_has_people: bool = Field(
        default=False,
        description="True if the chosen image depicts any human figure(s).",
    )
    # If image_has_people=True, which characters appear (use canonical names
    # from StoryProfile.characters). Used to pull their portrait_url into the
    # image generator's subject_reference for consistency across chapters.
    image_characters: List[str] = Field(
        default_factory=list,
        description="Canonical character names appearing in the image, if any.",
    )

    # Music: a small *delta* on top of the global music_baseline.
    music_mood: str = Field(
        ...,
        description=(
            "Chapter-specific mood adjustment, e.g. 'slightly more tense, add muted "
            "low strings, hint of unease'. Must stay within baseline's non-intense envelope."
        ),
    )

    key_dialogues: List[DialogueLine] = Field(
        default_factory=list,
        description="Top important dialogue lines to voice-act (max ~5).",
    )


class Chapter(BaseModel):
    """A parsed chapter ready for analysis."""
    index: int                  # 0-based
    title: str
    content: str
    word_count: int = 0


class Book(BaseModel):
    """Parsed book — output of the parser stage."""
    title: str
    author: Optional[str] = None
    source_path: str
    source_format: str          # 'epub' | 'pdf' | 'txt'
    chapters: List[Chapter]
    # For TXT / PDF we keep the cleaned-but-unsplit full text, so an LLM
    # fallback can re-detect chapter boundaries if the regex splitter was
    # unreliable. EPUB doesn't need this — it already has a real structure.
    raw_full_text: Optional[str] = None

    @property
    def full_text(self) -> str:
        parts = []
        for ch in self.chapters:
            parts.append(f"=== {ch.title} ===\n{ch.content}")
        return "\n\n".join(parts)

    @property
    def total_word_count(self) -> int:
        return sum(c.word_count for c in self.chapters)
