"""Generators for image, voice, and music.

Each modality has an abstract base class so providers can be swapped
without changing the orchestrator. Default concrete implementations:

    - OpenAIImageGenerator       (DALL·E 3)
    - ElevenLabsVoiceCaster      (voice library + character→voice_id mapping)
    - ElevenLabsVoiceGenerator   (TTS with locked voice_id per character)
    - ReplicateMusicGenerator    (Meta MusicGen)
"""
from __future__ import annotations

import abc
import io
import time
import shutil
from pathlib import Path
from pathlib import Path
from typing import Dict, List, Optional

import httpx

# --- Optional provider imports ----------------------------------------
# The orchestrator defaults to MiniMax for everything; the OpenAI /
# Replicate / ElevenLabs paths are kept for users who want to swap. If
# any of those packages is missing or broken-install, we don't want to
# crash the WHOLE pipeline at import time — that's killed too many
# Windows users with half-installed `elevenlabs` (the `elevenlabs.types`
# submodule ships hundreds of deeply-nested files that Windows long-path
# limits sometimes fail to unpack).
#
# So: try the real import, fall back to a tiny stub class that satisfies
# class definitions below but raises if anyone actually tries to use it.

try:
    from elevenlabs import VoiceSettings
    from elevenlabs.client import ElevenLabs
except Exception as _e_eleven:  # pragma: no cover
    class VoiceSettings:  # type: ignore
        def __init__(self, *a, **kw): pass
    class ElevenLabs:  # type: ignore
        def __init__(self, *a, **kw):
            raise RuntimeError(
                "ElevenLabs SDK not installed (or installed partially). "
                "This is fine — the pipeline defaults to MiniMax. "
                "Only matters if you switch orchestrator.py back to "
                "ElevenLabsVoiceCaster / ElevenLabsVoiceGenerator."
            )

try:
    import replicate  # noqa: F401
except Exception:  # pragma: no cover
    class _ReplicateStub:
        def run(self, *a, **kw):
            raise RuntimeError(
                "replicate SDK not installed. Only matters if you switch "
                "orchestrator.py back to ReplicateMusicGenerator."
            )
    replicate = _ReplicateStub()  # type: ignore

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    class OpenAI:  # type: ignore
        def __init__(self, *a, **kw):
            raise RuntimeError(
                "openai SDK not installed. Only matters if you switch "
                "orchestrator.py back to OpenAIImageGenerator."
            )

from anthropic import Anthropic

from config import Config
from models import Character, CharacterGender, DialogueLine, StoryProfile


# =========================================================================
# MUSIC HARD CONSTRAINTS
# =========================================================================
# These are the project-level invariants for ALL music generation in this
# pipeline. They are NOT prompt suggestions — they are enforced in two
# ways:
#   1. Hard-coded into every music prompt regardless of upstream input.
#   2. Used as a violation scanner against LLM outputs (music_baseline
#      from StoryAnalyzer, music_mood from ChapterAnalyzer). If a
#      violation slips through, the offending field is rewritten to a
#      safe equivalent before it ever reaches the music API.
#
# User-stated requirement, verbatim:
#   "音乐要求是可循环的可以当作背景音乐的不激烈的无歌词音乐"
# i.e. loopable / suitable as background / non-intense / no lyrics.
#
# If you ever need to relax this, change MUSIC_REQUIREMENTS_TEXT only
# and the new wording will propagate everywhere automatically.

MUSIC_REQUIREMENTS_TEXT = (
    "MANDATORY HARD CONSTRAINTS — non-negotiable, override anything else:\n"
    "  • LOOPABLE: end seamlessly into the start, no terminal cadence, "
    "no resolution sting, no fade-to-silence-and-stop;\n"
    "  • BACKGROUND-FRIENDLY: must sit underneath spoken narration without "
    "competing for attention;\n"
    "  • LOW INTENSITY: gentle dynamics throughout (mp to mf only), "
    "tempo 55–85 BPM, no climactic builds, no drops, no swells past mf;\n"
    "  • PURELY INSTRUMENTAL: zero vocals, zero lyrics, zero vocal samples, "
    "zero humming with formed consonants, zero spoken interjections."
)

MUSIC_FORBIDDEN_TEXT = (
    "STRICTLY FORBIDDEN (these would break the deliverable):\n"
    "  vocals, lyrics, singing, rapping, choir with words, vocal chops, "
    "EDM drops, dubstep, trap, big-room builds, four-on-the-floor kick, "
    "driving percussion loops, climactic crescendos, brass stabs, "
    "orchestral hits, percussion stings, sudden dynamic jumps, "
    "tempo above 95 BPM, hard-cut endings, applause, foley sound effects."
)


# Tokens that, if present in an LLM-produced music description, indicate
# the model ignored the constraints. Case-insensitive substring match.
# Lower-cased; matching is done after lower()ing the input.
_MUSIC_VIOLATION_TOKENS = (
    # Vocals
    "vocal", "lyric", "sung", "singing", "singer", "choir", "vocaliz", "rap",
    "歌词", "人声", "演唱", "唱腔",
    # Energy / climax words
    "climactic", "climax", "epic", "intense", "energetic", "high energy",
    "high-energy", "high tempo", "fast tempo", "uptempo", "up-tempo",
    "build-up", "build up", "buildup", "crescendo", "drop",
    "explosive", "powerful", "anthemic", "soaring", "thunderous",
    "激烈", "高潮", "澎湃", "震撼", "激昂", "热血", "高能",
    # Genre / instrumentation that violates the brief
    "edm", "dubstep", "trap beat", "drum and bass", "drum-and-bass",
    "rock band", "heavy metal", "metalcore", "punk",
    "techno", "house music", "dance floor", "club beat",
    # Percussion stings
    "percussion stings", "percussive hits", "orchestra hits",
    "big drums", "war drums", "tribal drums",
    # NOTE on words deliberately NOT in this list:
    #   "swell" — too ambiguous (a gentle piano swell is fine, an EDM
    #     drop swell is not). When the genuine violating case exists,
    #     other tokens (climactic / crescendo / build-up) catch it.
    #   "build" — same; substring of "building" / "building a motif" etc.
)


def _scan_music_violations(text: str) -> List[str]:
    """Return list of forbidden tokens found in `text`. Empty = clean.

    Negation handling: phrases like "no vocals", "without lyrics", "zero
    drops", "没有人声" are stripped BEFORE scanning, so a baseline that
    legitimately reassures "no vocals, fully instrumental" doesn't get
    flagged as a violation.

    The strip is intentionally simple: iteratively remove ``<negator> X``
    pairs (one word after each negator). This handles "no drops and no
    swells" cleanly, where a single greedy regex would let the second
    "no" be consumed as filler.
    """
    if not text:
        return []
    import re as _re
    lowered = text.lower()

    # English: a negator immediately followed by ONE word — repeated until
    # the text stabilises. Catches chained patterns like "no A and no B".
    en_neg_re = _re.compile(
        r"\b(?:no|without|zero|sans|lacking)\s+([a-z][a-z\-]*)",
        _re.IGNORECASE,
    )
    while True:
        new = en_neg_re.sub(" ", lowered)
        if new == lowered:
            break
        lowered = new
    # Chinese: 没有/无/绝无/不带/杜绝 + 1-6 CJK chars
    zh_neg_re = _re.compile(r"(?:没有|无|绝无|不带|杜绝)[\u4e00-\u9fff]{1,6}")
    lowered = zh_neg_re.sub(" ", lowered)

    return [tok for tok in _MUSIC_VIOLATION_TOKENS if tok in lowered]


# Safe replacements for when violations are detected. These are pre-vetted
# and known to satisfy the hard constraints.
SAFE_MUSIC_BASELINE = (
    "A loopable, low-intensity, fully instrumental ambient underscore. "
    "Instrumentation: felt-hammer piano, soft bowed strings (sul tasto), "
    "warm analog pad, sparse low cello, gentle wood percussion (no kit). "
    "Tempo 60–72 BPM, key D minor with dorian colour, dynamic envelope "
    "kept between mp and mf with no swells, no climactic builds, no drops. "
    "Role: instrumental underscore for reading — sits behind narration "
    "without pulling attention, ends in a way that loops cleanly into "
    "the start. Zero vocals, zero lyrics, zero vocal samples."
)

SAFE_MUSIC_MOOD_FALLBACK = (
    "subtle shift only; keep all hard constraints — slightly warmer "
    "timbres, a touch more space between phrases, no added intensity"
)


def sanitize_music_baseline(baseline: str) -> Tuple[str, List[str]]:
    """Return (clean_baseline, detected_violations). If violations exist,
    the returned baseline is replaced with the safe template; otherwise
    returns the original unchanged."""
    violations = _scan_music_violations(baseline)
    if violations:
        return SAFE_MUSIC_BASELINE, violations
    return baseline, []


def sanitize_music_mood(mood: str) -> Tuple[str, List[str]]:
    """Return (clean_mood, detected_violations). If violations exist,
    the mood is replaced with a safe minimal-delta template."""
    violations = _scan_music_violations(mood)
    if violations:
        return SAFE_MUSIC_MOOD_FALLBACK, violations
    return mood, []


# Tuple imported lazily because typing.Tuple already imported elsewhere in
# this module — re-importing here keeps this block self-contained for
# anyone copy-pasting the constraint logic to another project.
from typing import Tuple  # noqa: E402


# =========================================================================== IMAGE


class ImageGenerator(abc.ABC):
    @abc.abstractmethod
    def generate(
        self,
        scene_focus: str,
        scene_details: str,
        output_path: Path,
        subject_references: Optional[List[str]] = None,
        include_people: bool = True,
    ) -> Path:
        """Render an illustration to output_path.

        subject_references: optional list of publicly-accessible URLs of
            reference portraits (used by providers that support character
            consistency, e.g. MiniMax `subject_reference`). Providers that
            don't support it should ignore the argument.
        include_people: when False, the prompt should be hardened to
            exclude all human figures.
        """
        ...


class OpenAIImageGenerator(ImageGenerator):
    """DALL·E 3 illustration generator. Embeds the global art_style verbatim
    so a whole book reads as one art direction."""

    def __init__(self, config: Config, profile: StoryProfile):
        self.config = config
        self.profile = profile
        self.client = OpenAI(api_key=config.openai_api_key)

    def _compose_prompt(self, focus: str, scene_details: str) -> str:
        # Diffusion image models respond better to a single coherent
        # description than to a list of tagged fields. We open with the
        # global art_style (so the model establishes medium / palette /
        # lighting first), then describe the specific scene as one
        # continuous shot description.
        style = self.profile.art_style.strip().rstrip(".")
        negative = self.profile.art_style_negative.strip().rstrip(".")
        parts = [
            f"A cinematic book illustration rendered in this exact style: {style}.",
            f"The image depicts: {focus.strip().rstrip('.')}.",
            f"Scene details: {scene_details.strip().rstrip('.')}.",
            "Treat this as a single carefully-composed frame from a novel — "
            "professional concept-art quality, painterly depth, clear focal point.",
        ]
        avoid_clauses = [
            "no on-image text, no captions, no watermarks, no logos",
            "no UI elements, no signatures, no frame borders",
        ]
        if negative:
            avoid_clauses.insert(0, negative)
        parts.append("Avoid: " + "; ".join(avoid_clauses) + ".")
        return " ".join(parts)

    def generate(
        self,
        scene_focus: str,
        scene_details: str,
        output_path: Path,
        subject_references: Optional[List[str]] = None,
        include_people: bool = True,
    ) -> Path:
        # OpenAI DALL·E doesn't support subject_reference, so we ignore it.
        # We do honor include_people by hardening the prompt.
        prompt = self._compose_prompt(scene_focus, scene_details)
        if not include_people:
            prompt += " STRICT: depict no human figures, no faces, no silhouettes."
        # DALL-E prompts are capped at 4000 chars
        prompt = prompt[:3900]

        resp = self.client.images.generate(
            model=self.config.image_model,
            prompt=prompt,
            size=self.config.image_size,
            quality=self.config.image_quality,
            n=1,
        )
        img_url = resp.data[0].url
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with httpx.Client(timeout=120) as client:
            r = client.get(img_url)
            r.raise_for_status()
            output_path.write_bytes(r.content)
        return output_path


# =========================================================================== VOICE


class VoiceCaster(abc.ABC):
    """Assigns a stable voice_id to each character in the profile."""

    @abc.abstractmethod
    def cast(self, profile: StoryProfile) -> Dict[str, str]:
        """Mutates profile.characters[*].voice_id in place and returns the
        canonical_name -> voice_id mapping."""


class VoiceGenerator(abc.ABC):
    """Synthesises a dialogue line in a specific voice."""

    @abc.abstractmethod
    def synthesize(self, line: DialogueLine, voice_id: str, output_path: Path) -> Path:
        ...


class ElevenLabsVoiceCaster(VoiceCaster):
    """Uses Claude as the casting director: it reads ElevenLabs' voice library
    (with metadata: gender, age, accent, descriptive labels) and picks the
    best match for each character based on voice_description. Once assigned,
    the mapping is locked for the whole book."""

    def __init__(self, config: Config):
        self.config = config
        self.eleven = ElevenLabs(api_key=config.elevenlabs_api_key)
        self.claude = Anthropic(api_key=config.anthropic_api_key)

    def _fetch_voice_library(self) -> List[dict]:
        """Return a list of voice descriptors suitable for prompting Claude."""
        voices = self.eleven.voices.get_all().voices
        out = []
        for v in voices:
            labels = getattr(v, "labels", None) or {}
            out.append({
                "voice_id": v.voice_id,
                "name": v.name,
                "gender": labels.get("gender", "unknown"),
                "age": labels.get("age", "unknown"),
                "accent": labels.get("accent", ""),
                "description": labels.get("description", "")
                               or labels.get("descriptive", "")
                               or getattr(v, "description", "")
                               or "",
                "use_case": labels.get("use_case", "") or labels.get("use case", ""),
            })
        return out

    def cast(self, profile: StoryProfile) -> Dict[str, str]:
        if not profile.characters:
            return {}

        library = self._fetch_voice_library()
        if not library:
            raise RuntimeError(
                "ElevenLabs returned no voices. Check your subscription / API key."
            )

        # Ask Claude to do the casting in one shot — it has the whole library
        # and all characters, so it can avoid duplicating voices across roles.
        system = (
            "You are a voice casting director. You are given a roster of "
            "available TTS voices and a list of characters from a novel. "
            "Assign exactly one voice_id to each character based on their "
            "voice_description. Prefer DIFFERENT voice_ids for different "
            "characters when the library is big enough. Output strict JSON: "
            '{"assignments": [{"character": "<name>", "voice_id": "<id>", '
            '"voice_name": "<name>", "rationale": "<one line>"}]} — no markdown.'
        )
        user = (
            "AVAILABLE VOICES:\n"
            + "\n".join(
                f"- {v['voice_id']}: name={v['name']}, gender={v['gender']}, "
                f"age={v['age']}, accent={v['accent']}, desc={v['description']}, "
                f"use_case={v['use_case']}"
                for v in library
            )
            + "\n\nCHARACTERS TO CAST:\n"
            + "\n".join(
                f"- {c.name} (gender={c.gender.value}, age={c.age_group.value}): "
                f"{c.voice_description}"
                for c in profile.characters
            )
            + "\n\nReturn the JSON now."
        )

        resp = self.claude.messages.create(
            model=self.config.claude_model,
            max_tokens=4000,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        import json as _json
        text = resp.content[0].text
        # tolerant JSON extraction (reuse analyzer's helper to avoid drift)
        from analyzer import _extract_json_object
        data = _extract_json_object(text)
        assignments = data.get("assignments", [])

        mapping: Dict[str, str] = {}
        name_to_voice_name: Dict[str, str] = {}
        for a in assignments:
            mapping[a["character"]] = a["voice_id"]
            name_to_voice_name[a["character"]] = a.get("voice_name", "")

        # Mutate profile in place so downstream stages can serialise it.
        # Fall back to library[0] if Claude missed any character.
        fallback_voice_id = library[0]["voice_id"]
        fallback_voice_name = library[0]["name"]
        for c in profile.characters:
            c.voice_id = mapping.get(c.name, fallback_voice_id)
            c.voice_name = name_to_voice_name.get(c.name, fallback_voice_name)

        return {c.name: c.voice_id for c in profile.characters}


class ElevenLabsVoiceGenerator(VoiceGenerator):
    """Render one dialogue line as MP3 using a locked voice_id."""

    # Tune prosody slightly by emotion tag.
    _EMOTION_SETTINGS = {
        "neutral":   VoiceSettings(stability=0.55, similarity_boost=0.75, style=0.0, use_speaker_boost=True),
        "angry":     VoiceSettings(stability=0.30, similarity_boost=0.75, style=0.6, use_speaker_boost=True),
        "tender":    VoiceSettings(stability=0.70, similarity_boost=0.80, style=0.2, use_speaker_boost=True),
        "fearful":   VoiceSettings(stability=0.40, similarity_boost=0.75, style=0.5, use_speaker_boost=True),
        "sad":       VoiceSettings(stability=0.65, similarity_boost=0.80, style=0.3, use_speaker_boost=True),
        "joyful":    VoiceSettings(stability=0.45, similarity_boost=0.75, style=0.5, use_speaker_boost=True),
        "wry":       VoiceSettings(stability=0.55, similarity_boost=0.75, style=0.4, use_speaker_boost=True),
        "desperate": VoiceSettings(stability=0.35, similarity_boost=0.75, style=0.6, use_speaker_boost=True),
        "awed":      VoiceSettings(stability=0.60, similarity_boost=0.75, style=0.3, use_speaker_boost=True),
    }

    def __init__(self, config: Config):
        self.config = config
        self.client = ElevenLabs(api_key=config.elevenlabs_api_key)

    def synthesize(self, line: DialogueLine, voice_id: str, output_path: Path) -> Path:
        settings = self._EMOTION_SETTINGS.get(line.emotion.lower(), self._EMOTION_SETTINGS["neutral"])
        audio_stream = self.client.text_to_speech.convert(
            voice_id=voice_id,
            model_id=self.config.elevenlabs_model,
            text=line.text,
            voice_settings=settings,
            output_format="mp3_44100_128",
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            for chunk in audio_stream:
                if chunk:
                    f.write(chunk)
        return output_path


# =========================================================================== MUSIC


class MusicGenerator(abc.ABC):
    @abc.abstractmethod
    def generate(self, mood_delta: str, output_path: Path) -> Path:
        ...


class ReplicateMusicGenerator(MusicGenerator):
    """Meta's MusicGen via Replicate. Combines the global music_baseline
    with the chapter-specific mood delta so the score feels like one
    score across the whole book."""

    def __init__(self, config: Config, profile: StoryProfile):
        self.config = config
        self.profile = profile
        # Replicate client uses REPLICATE_API_TOKEN from env automatically.
        import os as _os
        _os.environ["REPLICATE_API_TOKEN"] = config.replicate_api_token

    def _compose_prompt(self, mood_delta: str) -> str:
        baseline = self.profile.music_baseline.strip().rstrip(".")
        mood = mood_delta.strip().rstrip(".")
        return (
            f"Cinematic underscore for reading aloud. Baseline: {baseline}. "
            f"This chapter's mood adjustment: {mood}. "
            "Fully instrumental — no vocals, no lyrics, no vocal samples, no "
            "humming with consonants. Loopable: the ending should be able to "
            "blend back into the beginning without a hard seam. "
            "Low to medium-low intensity throughout — no climactic builds, no "
            "drops, no big dynamic swells past mp/mf, no percussion stings, "
            "no driving rhythmic loops that pull attention. "
            "It must sit gently behind a reader's inner voice without "
            "distracting from the prose."
        )

    def generate(self, mood_delta: str, output_path: Path) -> Path:
        prompt = self._compose_prompt(mood_delta)
        output = replicate.run(
            self.config.music_model,
            input={
                "prompt": prompt,
                "duration": self.config.music_duration_seconds,
                "output_format": self.config.music_format,
                "normalization_strategy": "peak",
                "model_version": "stereo-large",
            },
        )
        # Replicate may return a FileOutput / URL / generator
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if hasattr(output, "read"):
            output_path.write_bytes(output.read())
        elif isinstance(output, (list, tuple)):
            url = output[0]
            with httpx.Client(timeout=300) as c:
                output_path.write_bytes(c.get(url).content)
        elif isinstance(output, str):
            with httpx.Client(timeout=300) as c:
                output_path.write_bytes(c.get(output).content)
        else:
            # Some clients return an object with .url
            url = getattr(output, "url", None)
            if not url:
                raise RuntimeError(f"Unexpected MusicGen output type: {type(output)}")
            with httpx.Client(timeout=300) as c:
                output_path.write_bytes(c.get(url).content)
        return output_path


class MockImageGenerator(ImageGenerator):
    def __init__(self, config=None, profile=None):
        self.config = config
        self.profile = profile

    def generate(
        self,
        scene_focus: str,
        scene_details: str,
        output_path: Path,
        subject_references: Optional[List[str]] = None,
        include_people: bool = True,
    ) -> Path:
        refs_note = f" (with {len(subject_references)} ref portraits)" if subject_references else ""
        people_note = "" if include_people else " (no-people mode)"
        print(f"  [Mock图像] 成功跳过，虚拟生成插图: {scene_focus}{refs_note}{people_note}")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.touch()
        return output_path


class MockVoiceCaster(VoiceCaster):
    def cast(self, profile: StoryProfile) -> dict[str, str]:
        print("  [Mock声优] 成功跳过 ElevenLabs 库，开始为名册角色分配虚拟音色...")
        for c in profile.characters:
            c.voice_id = f"mock_voice_id_{c.name}"
            c.voice_name = f"Mock_Voice_{c.name}"
        return {c.name: c.voice_id for c in profile.characters}


class MockVoiceGenerator(VoiceGenerator):
    def synthesize(self, line: DialogueLine, voice_id: str, output_path: Path) -> Path:
        print(f"  [Mock配音] 成功跳过 TTS，虚拟生成对白音频: {line.character} 说道 {line.text[:10]}...")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.touch()
        return output_path


class MockMusicGenerator(MusicGenerator):
    def __init__(self, config=None, profile=None):
        self.config = config
        self.profile = profile

    def generate(self, mood_delta: str, output_path: Path) -> Path:
        print(f"  [Mock音乐] 成功跳过 MusicGen，虚拟生成背景音乐，情绪偏移: {mood_delta}")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.touch()
        return output_path
    
    
# =========================================================================== MiniMax

import binascii
import json as _json

from anthropic import Anthropic as _MMAnthropic

# These imports may already be in scope from the top of the file, but
# re-declaring keeps this MiniMax block self-contained for readers.
from typing import Dict, List, Optional, Tuple
from models import Character, StoryProfile, DialogueLine
from config import Config


# Hard cap for MiniMax image API prompts (the API rejects >1500 chars).
_MINIMAX_IMAGE_PROMPT_MAX = 1450


def _truncate(s: str, n: int) -> str:
    s = (s or "").strip().rstrip(".")
    return s if len(s) <= n else s[: n - 1] + "…"


def _post_minimax_image(
    config: Config,
    prompt: str,
    aspect_ratio: str = "16:9",
    subject_references: Optional[List[str]] = None,
) -> bytes:
    """Single low-level wrapper around POST /v1/image_generation.

    Always requests base64 response_format (per the official docs that's the
    recommended path: avoids a second hop to download from CDN, and the
    bytes are exactly what we want to write to disk anyway).

    Returns the raw image bytes. Raises on API errors.
    """
    url = "https://api.minimax.io/v1/image_generation"
    headers = {
        "Authorization": f"Bearer {config.minimax_paygo_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.image_model,
        "prompt": prompt[:_MINIMAX_IMAGE_PROMPT_MAX],
        "aspect_ratio": aspect_ratio,
        "response_format": "base64",
    }
    if subject_references:
        payload["subject_reference"] = [
            {"type": "character", "image_file": url_}
            for url_ in subject_references
            if url_
        ]

    resp = httpx.post(url, headers=headers, json=payload, timeout=180)
    resp.raise_for_status()
    data = resp.json()

    # Surface explicit API errors (status_code != 0 in base_resp)
    base = data.get("base_resp") or {}
    if base.get("status_code") not in (0, None):
        raise RuntimeError(
            f"MiniMax image API error {base.get('status_code')}: "
            f"{base.get('status_msg')!r}; payload prompt[:120]={prompt[:120]!r}"
        )

    images_b64 = (data.get("data") or {}).get("image_base64") or []
    if not images_b64:
        raise RuntimeError(f"MiniMax image API returned no images: {data}")
    import base64 as _b64
    return _b64.b64decode(images_b64[0])


def _post_minimax_image_with_url(
    config: Config,
    prompt: str,
    aspect_ratio: str = "9:16",
) -> Tuple[bytes, Optional[str]]:
    """Variant that also returns the CDN URL of the generated image.

    Used for character portraits: we save the bytes locally for inspection
    AND keep the CDN URL so it can be passed as subject_reference to
    chapter image calls (which take a URL, not bytes).

    NB: MiniMax CDN URLs are publicly accessible but may expire after some
    days/weeks. For multi-day re-runs, regenerate portraits.
    """
    url = "https://api.minimax.io/v1/image_generation"
    headers = {
        "Authorization": f"Bearer {config.minimax_paygo_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.image_model,
        "prompt": prompt[:_MINIMAX_IMAGE_PROMPT_MAX],
        "aspect_ratio": aspect_ratio,
        # Ask for URL so we have something passable as subject_reference.
        # We also download the bytes ourselves below.
        "response_format": "url",
    }
    resp = httpx.post(url, headers=headers, json=payload, timeout=180)
    resp.raise_for_status()
    data = resp.json()

    base = data.get("base_resp") or {}
    if base.get("status_code") not in (0, None):
        raise RuntimeError(
            f"MiniMax image API error {base.get('status_code')}: "
            f"{base.get('status_msg')!r}"
        )

    urls = (data.get("data") or {}).get("image_urls") or []
    if not urls:
        raise RuntimeError(f"MiniMax image API returned no URLs: {data}")
    img_url = urls[0]
    with httpx.Client(timeout=180) as c:
        r = c.get(img_url)
        r.raise_for_status()
        img_bytes = r.content
    return img_bytes, img_url


# --------------------------------------------------------------------- IMAGE


class MiniMaxImageGenerator(ImageGenerator):
    """MiniMax `image-01` illustration generator.

    Wraps two related capabilities:
      • Pure text-to-image — composes a cinematic prompt from the global
        art_style + chapter scene details, optionally hardened against
        rendering people.
      • Subject-reference — if the caller passes portrait URLs of named
        characters appearing in the scene, they're attached via the
        `subject_reference` field so the same character looks like the
        same character across chapters.

    The prompt is always capped at 1450 chars to stay inside the API's
    1500-char hard limit.
    """

    def __init__(self, config: Config, profile: StoryProfile):
        self.config = config
        self.profile = profile

    def _compose_prompt(
        self,
        focus: str,
        scene_details: str,
        include_people: bool,
        has_references: bool,
    ) -> str:
        # We use a HYBRID prompt format:
        #   • Semantic English prose at the head (anchors style + content,
        #     gives the model narrative context).
        #   • A comma-separated tag stream at the tail (the MiniMax docs'
        #     reference example uses this format — "Fashion photography of
        #     90s, documentary, Film grain, photorealistic" — and the
        #     image-01 model responds noticeably more to it than to pure
        #     prose).
        # Budget the components so the total stays well under 1450 chars.
        style = _truncate(self.profile.art_style, 480)
        negative = _truncate(self.profile.art_style_negative, 160)
        focus_t = _truncate(focus, 160)
        scene_t = _truncate(scene_details, 420)

        parts = [
            f"Cinematic book illustration. Art style: {style}.",
            f"Subject: {focus_t}.",
            f"Scene: {scene_t}.",
            "Treat this as a single carefully-composed frame from a "
            "novel — clear focal point, painterly depth, professional "
            "concept-art quality.",
        ]
        if has_references:
            parts.append(
                "Preserve the appearance of the referenced character(s) "
                "(face, hair, signature outfit) exactly; do not redesign them."
            )

        # Visual reinforcement tag stream — short evocative tags the model
        # is trained to weight heavily. Keep this list curated; long tag
        # stacks dilute each other.
        visual_tags = [
            "cinematic composition",
            "rule of thirds",
            "carefully designed lighting",
            "painterly brushwork",
            "rich tonal depth",
            "high detail",
            "atmospheric perspective",
            "professional concept art",
        ]
        if not include_people:
            visual_tags.append("empty of human figures")
        parts.append("Tags: " + ", ".join(visual_tags) + ".")

        # Negative / avoidance clauses (always last so the model sees them).
        avoid_clauses: List[str] = []
        if negative:
            avoid_clauses.append(negative)
        avoid_clauses.append(
            "no on-image text, no captions, no watermarks, no logos, "
            "no UI elements, no signatures, no frame borders"
        )
        if not include_people:
            avoid_clauses.append(
                "STRICT: no human figures, no faces, no silhouettes of "
                "people, not even in the background — environment only"
            )
        parts.append("Avoid: " + "; ".join(avoid_clauses) + ".")
        return " ".join(parts)

    def generate(
        self,
        scene_focus: str,
        scene_details: str,
        output_path: Path,
        subject_references: Optional[List[str]] = None,
        include_people: bool = True,
    ) -> Path:
        # Strip None/empty refs; only attach reference if we'll show people.
        refs = [u for u in (subject_references or []) if u] if include_people else []
        prompt = self._compose_prompt(
            scene_focus, scene_details,
            include_people=include_people,
            has_references=bool(refs),
        )

        try:
            img_bytes = _post_minimax_image(
                self.config, prompt, aspect_ratio="16:9",
                subject_references=refs or None,
            )
        except Exception as e:
            # If subject_reference URLs expired or were rejected, try once
            # more without them so we at least get a chapter image.
            if refs:
                print(f"  [图像] 参考图调用失败 ({e})，降级到无 reference 重试…")
                prompt_noref = self._compose_prompt(
                    scene_focus, scene_details,
                    include_people=include_people,
                    has_references=False,
                )
                img_bytes = _post_minimax_image(
                    self.config, prompt_noref, aspect_ratio="16:9",
                )
            else:
                raise

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(img_bytes)
        return output_path


# --------------------------------------------------------- PORTRAITS


class MiniMaxCharacterPortraitGenerator:
    """One-off portrait generator for each named character.

    Why: MiniMax `image-01` supports `subject_reference` with a URL pointing
    at a character image. To get visual continuity for "甄嬛" / "玄凌" / etc.
    across chapters, we generate ONE canonical portrait per character early
    on, save its bytes locally (for inspection / fallback), and remember its
    public CDN URL — which is then passed in to every chapter image where
    that character appears.

    Portrait prompts are tight close-up shots so the reference signal is
    strong: face shape, hair, signature outfit, against a soft neutral
    background. We deliberately keep the art_style applied so the portrait
    matches the book's visual identity.
    """

    def __init__(self, config: Config, profile: StoryProfile):
        self.config = config
        self.profile = profile

    def _compose_prompt(self, character: Character) -> str:
        style = _truncate(self.profile.art_style, 450)
        appearance = _truncate(
            character.appearance or character.description, 320
        )
        return (
            f"Character reference portrait in this exact art style: {style}. "
            f"Subject: {character.name}, {character.gender.value}, "
            f"{character.age_group.value}. Appearance: {appearance}. "
            "Shot: medium close-up from chest up, three-quarter angle, "
            "looking slightly off-camera, neutral expression, soft even "
            "lighting, plain softly-blurred neutral background. The whole "
            "frame should serve as a clean visual reference of this character. "
            "Tags: character sheet portrait, three-quarter view, soft key "
            "light, neutral background, sharp facial features, painterly "
            "rendering, high detail, professional concept art. "
            "Avoid: no on-image text, no captions, no watermarks, no logos, "
            "no other people in frame, no busy background, no UI elements, "
            "no extreme expressions, no harsh shadows on the face."
        )

    def generate(self, character: Character, output_path: Path) -> Tuple[Path, Optional[str]]:
        prompt = self._compose_prompt(character)
        # Portraits use a portrait aspect ratio (taller than wide).
        img_bytes, img_url = _post_minimax_image_with_url(
            self.config, prompt, aspect_ratio="9:16",
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(img_bytes)
        return output_path, img_url


# ---------------------------------------------------------- VOICE CAST


# Curated subset of the official MiniMax voice library, focused on Chinese
# storytelling because that's our most common use case. Keeps the prompt
# passed to the casting LLM short and on-topic. To extend / swap, see:
# https://platform.minimax.io/docs/...  (the System Voice ID List page).
_MINIMAX_VOICE_LIBRARY: List[dict] = [
    # ---- Chinese female ----
    {"voice_id": "Chinese (Mandarin)_Mature_Woman", "name": "Mature Woman", "lang": "zh", "gender": "female", "age": "adult/elder", "desc": "成熟稳重的女性，气场强、适合王后/太后/掌权女性"},
    {"voice_id": "Chinese (Mandarin)_Wise_Women", "name": "Wise Women", "lang": "zh", "gender": "female", "age": "adult", "desc": "智慧从容的成年女性，沉稳有威信"},
    {"voice_id": "Chinese (Mandarin)_Warm-HeartedAunt", "name": "Warm-hearted Aunt", "lang": "zh", "gender": "female", "age": "elder", "desc": "温暖年长女性，慈祥可亲，适合嬷嬷/姑姑"},
    {"voice_id": "Chinese (Mandarin)_Kind-hearted_Antie", "name": "Kind-hearted Antie", "lang": "zh", "gender": "female", "age": "elder", "desc": "善良大妈，质朴温和"},
    {"voice_id": "Arrogant_Miss", "name": "Arrogant Miss", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "傲娇小姐，挑衅刻薄，适合骄横千金/反派妃嫔"},
    {"voice_id": "Chinese (Mandarin)_Sweet_Lady", "name": "Sweet Lady", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "温柔甜美的成年女性"},
    {"voice_id": "Chinese (Mandarin)_Warm_Bestie", "name": "Warm Bestie", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "温暖闺蜜感，亲近自然"},
    {"voice_id": "Chinese (Mandarin)_IntellectualGirl", "name": "Intellectual Girl", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "知性少女，清亮聪慧"},
    {"voice_id": "Chinese (Mandarin)_Warm_HeartedGirl", "name": "Warm-hearted Girl", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "温暖友善的少女"},
    {"voice_id": "Chinese (Mandarin)_Soft_Girl", "name": "Soft Girl", "lang": "zh", "gender": "female", "age": "teen", "desc": "柔软轻盈的少女声，娇怯纯真"},
    {"voice_id": "Chinese (Mandarin)_Warm_Girl", "name": "Warm Girl", "lang": "zh", "gender": "female", "age": "teen", "desc": "温暖少女声"},
    {"voice_id": "Chinese (Mandarin)_Crisp_Girl", "name": "Crisp Girl", "lang": "zh", "gender": "female", "age": "teen", "desc": "清脆少女声，活泼明快"},
    {"voice_id": "Chinese (Mandarin)_BashfulGirl", "name": "Bashful Girl", "lang": "zh", "gender": "female", "age": "teen", "desc": "害羞少女，轻声细语"},
    {"voice_id": "Chinese (Mandarin)_Laid_BackGirl", "name": "Laid-back Girl", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "慵懒随性少女"},
    {"voice_id": "Chinese (Mandarin)_ExplorativeGirl", "name": "Explorative Girl", "lang": "zh", "gender": "female", "age": "young_adult", "desc": "好奇探索型少女"},
    {"voice_id": "Chinese (Mandarin)_Cute_Spirit", "name": "Cute Spirit", "lang": "zh", "gender": "neutral", "age": "child", "desc": "可爱精灵感小童声"},
    # ---- Chinese male ----
    {"voice_id": "Chinese (Mandarin)_Gentleman", "name": "Gentleman", "lang": "zh", "gender": "male", "age": "adult", "desc": "绅士男声，温润儒雅，适合皇帝/世家公子"},
    {"voice_id": "Chinese (Mandarin)_Reliable_Executive", "name": "Reliable Executive", "lang": "zh", "gender": "male", "age": "adult", "desc": "可靠成熟男性，沉稳权威"},
    {"voice_id": "Chinese (Mandarin)_News_Anchor", "name": "News Anchor", "lang": "zh", "gender": "male", "age": "adult", "desc": "新闻主播式标准音，端正清晰"},
    {"voice_id": "Chinese (Mandarin)_Male_Announcer", "name": "Male Announcer", "lang": "zh", "gender": "male", "age": "adult", "desc": "男播音员，正式中带温度"},
    {"voice_id": "Chinese (Mandarin)_Radio_Host", "name": "Radio Host", "lang": "zh", "gender": "male", "age": "adult", "desc": "电台主持，磁性温暖"},
    {"voice_id": "Chinese (Mandarin)_Lyrical_Voice", "name": "Lyrical Voice", "lang": "zh", "gender": "male", "age": "adult", "desc": "抒情男声，富有感染力"},
    {"voice_id": "Chinese (Mandarin)_Sincere_Adult", "name": "Sincere Adult", "lang": "zh", "gender": "male", "age": "adult", "desc": "诚恳成年男声"},
    {"voice_id": "Chinese (Mandarin)_Gentle_Senior", "name": "Gentle Senior", "lang": "zh", "gender": "male", "age": "elder", "desc": "温和年长男性"},
    {"voice_id": "Chinese (Mandarin)_Kind-hearted_Elder", "name": "Kind-hearted Elder", "lang": "zh", "gender": "male", "age": "elder", "desc": "善良长者"},
    {"voice_id": "Chinese (Mandarin)_Humorous_Elder", "name": "Humorous Elder", "lang": "zh", "gender": "male", "age": "elder", "desc": "幽默长者，慈祥健谈"},
    {"voice_id": "Chinese (Mandarin)_Unrestrained_Young_Man", "name": "Unrestrained Young Man", "lang": "zh", "gender": "male", "age": "young_adult", "desc": "不羁青年男声"},
    {"voice_id": "Chinese (Mandarin)_Southern_Young_Man", "name": "Southern Young Man", "lang": "zh", "gender": "male", "age": "young_adult", "desc": "南方青年男声，温柔细腻"},
    {"voice_id": "Chinese (Mandarin)_Gentle_Youth", "name": "Gentle Youth", "lang": "zh", "gender": "male", "age": "young_adult", "desc": "温柔青年男声"},
    {"voice_id": "Chinese (Mandarin)_Stubborn_Friend", "name": "Stubborn Friend", "lang": "zh", "gender": "male", "age": "young_adult", "desc": "倔强朋友型男声"},
    {"voice_id": "Chinese (Mandarin)_Straightforward_Boy", "name": "Straightforward Boy", "lang": "zh", "gender": "male", "age": "teen", "desc": "直率少年"},
    {"voice_id": "Chinese (Mandarin)_Pure-hearted_Boy", "name": "Pure-hearted Boy", "lang": "zh", "gender": "male", "age": "teen", "desc": "纯心少年"},
]


_CASTING_SYSTEM = """You are a voice casting director for an audiobook.
You will receive (a) a roster of available TTS voices with metadata and
(b) a list of named characters with gender/age/voice_description.

Assign EXACTLY ONE voice to each character. Hard rules:

1. Match gender first — never put a male voice on a clearly female
   character, or vice versa. ("neutral" / "unknown" gender can take
   either.) Mis-matched gender is the single worst failure mode.
2. Match age band: child / teen / young_adult / adult / elder.
   Use the closest available bucket if the exact one isn't there.
3. Among the gender+age candidates, pick the one whose `desc` best fits
   the character's `voice_description` (temperament, status, vibe).
4. Prefer DIFFERENT voices for different characters. Only reuse a voice
   if you've run out of suitable matches.
5. The voice_id you output MUST be one of the provided voice_ids,
   verbatim including spaces and parentheses. Copy-paste it; do not
   invent or paraphrase.

Output STRICT JSON, no markdown, no commentary:

{
  "assignments": [
    {"character": "<canonical name>",
     "voice_id":  "<id from the library, verbatim>",
     "voice_name": "<human name from the library>",
     "rationale": "<one short sentence why>"}
  ]
}
"""


class MiniMaxVoiceCaster(VoiceCaster):
    """Smart casting: hands the full voice library + character roster to
    MiniMax's LLM (via the Anthropic-compatible endpoint) and asks for a
    gender/age/vibe-aware assignment. Falls back to a deterministic
    gender+age bucket scan if the LLM call fails so the pipeline never
    blocks here."""

    def __init__(self, config: Config):
        self.config = config
        self.client = _MMAnthropic(
            api_key=config.minimax_text_key,
            base_url="https://api.minimax.io/anthropic",
        )

    # ------------------------- public -------------------------

    def cast(self, profile: StoryProfile) -> Dict[str, str]:
        if not profile.characters:
            return {}
        print(f"  [MiniMax 选角] 为 {len(profile.characters)} 位角色进行 LLM 智能分派…")

        try:
            mapping = self._cast_via_llm(profile)
        except Exception as e:
            print(f"  [选角] LLM 调用失败，降级到 gender/age 规则匹配: {e}")
            mapping = {}

        # Whatever the LLM produced, fill remaining gaps deterministically
        # so every character has a voice.
        used: List[str] = []
        for c in profile.characters:
            assigned = mapping.get(c.name)
            if assigned and self._is_known_voice(assigned):
                c.voice_id = assigned
                c.voice_name = self._voice_name(assigned)
            else:
                v = self._fallback_pick(c, used)
                c.voice_id = v["voice_id"]
                c.voice_name = v["name"]
            used.append(c.voice_id)

        return {c.name: c.voice_id for c in profile.characters}

    # ------------------------- LLM path -------------------------

    def _cast_via_llm(self, profile: StoryProfile) -> Dict[str, str]:
        lib = _MINIMAX_VOICE_LIBRARY
        user = (
            "AVAILABLE VOICES (use voice_id VERBATIM):\n"
            + "\n".join(
                f"- voice_id={v['voice_id']!r}  name={v['name']!r}  "
                f"gender={v['gender']}  age={v['age']}  desc={v['desc']}"
                for v in lib
            )
            + "\n\nCHARACTERS TO CAST:\n"
            + "\n".join(
                f"- name={c.name!r}  gender={c.gender.value}  "
                f"age={c.age_group.value}  voice_description={c.voice_description!r}"
                for c in profile.characters
            )
            + "\n\nReturn the JSON now."
        )
        resp = self.client.messages.create(
            model=self.config.minimax_model,
            max_tokens=4000,
            system=_CASTING_SYSTEM,
            messages=[{"role": "user", "content": user}],
        )
        raw = "".join(b.text for b in resp.content if b.type == "text")
        # Reuse the analyzer's JSON extractor — same tolerance rules.
        from analyzer import _extract_json_object
        data = _extract_json_object(raw)
        mapping: Dict[str, str] = {}
        for a in data.get("assignments", []):
            name = a.get("character")
            vid = a.get("voice_id")
            if name and vid:
                mapping[name] = vid
        return mapping

    # ------------------------- helpers / fallback -------------------------

    @staticmethod
    def _is_known_voice(vid: str) -> bool:
        return any(v["voice_id"] == vid for v in _MINIMAX_VOICE_LIBRARY)

    @staticmethod
    def _voice_name(vid: str) -> str:
        for v in _MINIMAX_VOICE_LIBRARY:
            if v["voice_id"] == vid:
                return v["name"]
        return vid

    @staticmethod
    def _fallback_pick(c: Character, used: List[str]) -> dict:
        """Deterministic rule: filter by gender, then age proximity, then
        pick the first one not yet used. If all matches are used, allow
        reuse (large books with few suitable voices)."""
        want_gender = c.gender.value
        want_age = c.age_group.value

        def gender_ok(v: dict) -> bool:
            if want_gender in ("unknown", "neutral"):
                return True
            return v["gender"] == want_gender or v["gender"] == "neutral"

        candidates = [v for v in _MINIMAX_VOICE_LIBRARY if gender_ok(v)]
        if not candidates:
            candidates = list(_MINIMAX_VOICE_LIBRARY)

        # Sort by: same age band first, then bands containing the requested age.
        def age_score(v: dict) -> int:
            ages = v["age"]
            if want_age in ages.split("/"):
                return 0
            return 1
        candidates.sort(key=age_score)

        for v in candidates:
            if v["voice_id"] not in used:
                return v
        return candidates[0]


# --------------------------------------------------------- VOICE GEN


class MiniMaxVoiceGenerator(VoiceGenerator):
    """MiniMax t2a_v2 wrapper. Accepts a DialogueLine and writes an mp3.

    Quality knobs we exploit:
      • Inline sound tags (e.g. ``(sighs)``, ``(softly)``) — supported by
        speech-2.8-hd. We auto-inject one matching the emotion so the same
        line carries audible affect, not just adjusted pitch/speed.
      • Pitch / speed / volume nudges per emotion bucket. These help on
        every model but matter most on -turbo where sound tags are ignored.
      • audio_setting bitrate raised to 128 kbps (the docs' reference
        value) — the previous request used the API default which sounded
        thinner.
    """

    # Conservative prosody nudges keyed on the analyzer's whitelist.
    _PROSODY = {
        "neutral":   {"speed": 1.00, "vol": 1.0, "pitch": 0},
        "angry":     {"speed": 1.10, "vol": 1.1, "pitch": 1},
        "tender":    {"speed": 0.92, "vol": 0.9, "pitch": -1},
        "fearful":   {"speed": 1.05, "vol": 0.9, "pitch": 1},
        "sad":       {"speed": 0.90, "vol": 0.9, "pitch": -2},
        "joyful":    {"speed": 1.08, "vol": 1.05, "pitch": 1},
        "wry":       {"speed": 0.98, "vol": 1.0, "pitch": 0},
        "desperate": {"speed": 1.08, "vol": 1.1, "pitch": 1},
        "awed":      {"speed": 0.95, "vol": 1.0, "pitch": 0},
    }

    # Inline sound tags injected at the head of the dialogue text. Only
    # speech-2.8-hd reliably parses these (the docs show ``(sighs)`` in its
    # example); turbo/older models may read them literally, so we gate.
    _SOUND_TAGS = {
        "neutral":   "",
        "angry":     "(in an angry tone) ",
        "tender":    "(softly) ",
        "fearful":   "(trembling) ",
        "sad":       "(with a sigh) ",
        "joyful":    "(brightly) ",
        "wry":       "(sardonically) ",
        "desperate": "(urgently) ",
        "awed":      "(in wonder) ",
    }
    _MODELS_SUPPORTING_SOUND_TAGS = {"speech-2.8-hd"}

    def __init__(self, config: Config):
        self.config = config

    def _prepare_text(self, line: DialogueLine) -> str:
        """Optionally prepend a sound tag matching the emotion. Only
        applied when the configured model is known to parse tags — on
        every other model the parenthetical would be read aloud."""
        if self.config.minimax_voice_model not in self._MODELS_SUPPORTING_SOUND_TAGS:
            return line.text
        tag = self._SOUND_TAGS.get(line.emotion.lower(), "")
        return f"{tag}{line.text}" if tag else line.text

    def synthesize(self, line: DialogueLine, voice_id: str, output_path: Path) -> Path:
        prosody = self._PROSODY.get(line.emotion.lower(), self._PROSODY["neutral"])
        text = self._prepare_text(line)
        url = "https://api.minimax.io/v1/t2a_v2"
        headers = {
            "Authorization": f"Bearer {self.config.minimax_paygo_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.config.minimax_voice_model,
            "text": text,
            "voice_setting": {
                "voice_id": voice_id,
                "speed": prosody["speed"],
                "vol": prosody["vol"],
                "pitch": prosody["pitch"],
                "english_normalization": False,
            },
            # Per the official docs' reference setting: 32 kHz / 128 kbps.
            # The default the API picks when bitrate is omitted is lower
            # and audibly thinner on headphones.
            "audio_setting": {
                "format": "mp3",
                "sample_rate": 32000,
                "bitrate": 128000,
                "channel": 1,
            },
        }
        resp = httpx.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        # Surface API-level errors instead of silently writing nothing.
        base = data.get("base_resp") or {}
        if base.get("status_code") not in (0, None):
            raise RuntimeError(
                f"MiniMax TTS error {base.get('status_code')}: "
                f"{base.get('status_msg')!r}"
            )

        audio_hex = ((data.get("data") or {}).get("audio") or "")
        if not audio_hex:
            raise RuntimeError(f"MiniMax TTS returned no audio: {data}")
        audio_bytes = binascii.unhexlify(audio_hex)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(audio_bytes)
        return output_path


# --------------------------------------------------------- MUSIC


class MiniMaxMusicGenerator(MusicGenerator):
    """MiniMax `music-2.6` wrapper.

    Project invariant — ALL generated music MUST be:
      • loopable (no terminal cadence, can splice end → start cleanly)
      • background-friendly (sits under spoken narration)
      • low intensity (mp–mf, 55–85 BPM, no climaxes, no drops)
      • purely instrumental (zero vocals, lyrics, vocal samples)

    These constraints are enforced in THREE places (defence in depth):
      1. `_compose_prompt()` injects MUSIC_REQUIREMENTS_TEXT and
         MUSIC_FORBIDDEN_TEXT verbatim, regardless of upstream input.
      2. `sanitize_music_baseline()` / `sanitize_music_mood()` scrub the
         LLM's output BEFORE it reaches us; if violations are detected
         we substitute SAFE_MUSIC_BASELINE / SAFE_MUSIC_MOOD_FALLBACK.
      3. The API payload always sets `is_instrumental: True` (locked),
         and `lyrics` is reduced to pure structural markers with no
         word content the music model could try to sing.
    """

    # IMPORTANT: keep this LYRICS scaffold as pure section markers.
    # Earlier we used "(Instrumental Solo)" inside parentheses, which is
    # safer than real lyrics but still gives the music model a string of
    # English words it could try to interpret. Bare brackets are the
    # safest: they tell the model "treat this as a 5-section composition"
    # without supplying any singable content.
    _LYRICS_SCAFFOLD = (
        "[Intro]\n"
        "[A]\n"
        "[B]\n"
        "[Reprise]\n"
        "[Outro]"
    )

    def __init__(self, config: Config, profile: StoryProfile):
        self.config = config
        self.profile = profile

    def _compose_prompt(self, mood_delta: str) -> str:
        # Defensive sanitisation — even though upstream analyzers also
        # sanitise, we sanitise again here as the last line of defence.
        clean_baseline, base_violations = sanitize_music_baseline(
            self.profile.music_baseline
        )
        clean_mood, mood_violations = sanitize_music_mood(mood_delta)
        if base_violations:
            print(
                f"   ⚠️  music_baseline 包含违禁词 {base_violations} — 已替换为安全模板"
            )
        if mood_violations:
            print(
                f"   ⚠️  music_mood 包含违禁词 {mood_violations} — 已替换为最小变化模板"
            )

        baseline = _truncate(clean_baseline, 400)
        mood = _truncate(clean_mood, 160)

        # Order matters: put the hard constraints FIRST (primacy) and
        # the forbidden list LAST (recency) so the model sees them on
        # both ends of the prompt window.
        return (
            f"{MUSIC_REQUIREMENTS_TEXT}\n\n"
            f"Style baseline (apply consistently to every chapter): "
            f"{baseline}\n\n"
            f"This chapter's mood adjustment (subtle delta only): "
            f"{mood}\n\n"
            "Tags: ambient underscore, cinematic score, contemplative, "
            "loopable, sustained pads, soft dynamics, low intensity, "
            "instrumental only, headphone-friendly, background music, "
            "evolving slowly, no vocals, no lyrics.\n\n"
            f"{MUSIC_FORBIDDEN_TEXT}"
        )

    def generate(self, mood_delta: str, output_path: Path) -> Path:
        prompt = self._compose_prompt(mood_delta)
        url = "https://api.minimax.io/v1/music_generation"
        headers = {
            "Authorization": f"Bearer {self.config.minimax_paygo_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.config.minimax_music_model,
            "prompt": prompt,
            "lyrics": self._LYRICS_SCAFFOLD,
            # HARD-LOCKED, do not parameterise. The whole pipeline assumes
            # purely instrumental output.
            "is_instrumental": True,
            "audio_setting": {
                "sample_rate": 44100,
                "bitrate": 256000,
                "format": "mp3",
            },
            "output_format": "url",
        }
        resp = httpx.post(url, headers=headers, json=payload, timeout=180)
        resp.raise_for_status()
        data = resp.json()

        base = data.get("base_resp") or {}
        if base.get("status_code") not in (0, None):
            raise RuntimeError(
                f"MiniMax music error {base.get('status_code')}: "
                f"{base.get('status_msg')!r}"
            )

        d = data.get("data") or {}
        music_url = d.get("audio") or d.get("url") or ""
        if not music_url:
            raise RuntimeError(f"MiniMax music API returned no audio URL: {data}")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with httpx.Client(timeout=600) as client:
            r = client.get(music_url)
            r.raise_for_status()
            output_path.write_bytes(r.content)
        return output_path
