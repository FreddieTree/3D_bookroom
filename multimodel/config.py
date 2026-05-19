"""Central configuration. Loads from .env, exposes a typed Config object."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    # --- API credentials ---
    anthropic_api_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    elevenlabs_api_key: str = field(default_factory=lambda: os.getenv("ELEVENLABS_API_KEY", ""))
    replicate_api_token: str = field(default_factory=lambda: os.getenv("REPLICATE_API_TOKEN", ""))
    # --- MiniMax API 专属配置 ---
    # --- MiniMax API 专属配置 ---
    minimax_text_key: str = field(default_factory=lambda: os.getenv("MINIMAX_TEXT_KEY", ""))
    minimax_paygo_key: str = field(default_factory=lambda: os.getenv("MINIMAX_PAYGO_KEY", ""))
    minimax_model: str = "MiniMax-M2.5-highspeed"
    # max_tokens for analyzer calls. 4000 turned out too tight for books
    # with 5+ characters where each gets a multi-field Chinese description;
    # the model would run out mid-JSON and produce an unparseable response.
    # 8000 is comfortable for ~10 characters with rich appearance/voice
    # descriptions. Bump higher for ensembles.
    minimax_text_max_tokens: int = 8000
    # speech-2.8-hd: ultra-realistic + supports inline sound tags like
    #   "(sighs)", "(whispers)", "(in an angry tone)". Slightly more
    #   expensive than -turbo but qualitatively better for audiobook
    #   narration. Switch to "speech-2.8-turbo" to trade quality for cost.
    minimax_voice_model: str = "speech-2.8-hd"
    minimax_music_model: str = "music-2.6"
    
    # --- Model selection ---
    # Claude for story understanding & chapter planning
    claude_model: str = "claude-opus-4-7"
    # DALL-E 3 for illustrations
    image_model: str = "image-01"
    image_size: str = "1792x1024"     # widescreen for "book illustration" feel
    image_quality: str = "hd"
    # ElevenLabs voice synthesis model
    elevenlabs_model: str = "eleven_multilingual_v2"
    # Replicate model slug for MusicGen (melody-large gives best instrumental vibe)
    music_model: str = "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"

    # --- Generation behaviour ---
    max_dialogues_per_chapter: int = 5         # keep cost predictable
    music_duration_seconds: int = 30           # short loopable clip
    music_format: str = "mp3"

    # --- Pipeline behaviour ---
    concurrent_chapter_workers: int = 2        # parallel chapter processing
    concurrent_voices_per_chapter: int = 3     # parallel TTS within a chapter
    skip_existing: bool = True                 # don't regenerate existing files
    max_chapters: int | None = None            # for quick smoke testing
    # If True, after parsing the book the pipeline prints the detected
    # chapter list and prompts the user for how many chapters to generate.
    # Always silently disabled when stdin is not a TTY or --max-chapters is
    # already set on the CLI.
    interactive: bool = True

    # --- People / portraits ---
    # If True, a reference portrait is generated once per character and
    # passed to subsequent chapter illustrations as subject_reference, so
    # the character looks like the same person across chapters.
    # Costs ~1 extra image per character (one-off).
    generate_character_portraits: bool = True
    # If False, chapter illustrations will never depict people. The chapter
    # analyzer is told to pick environment / object shots only, and the image
    # prompt explicitly excludes humans. Useful for atmospheric-only books or
    # to dodge face-rendering glitches.
    include_people_in_scenes: bool = True
    # Set by main.py when the user passes --no-people or --no-portraits on
    # the command line. In that case the orchestrator skips the interactive
    # image-mode prompt entirely (the user has already decided).
    skip_image_mode_prompt: bool = False

    # If the novel is longer than this many characters, the analyzer will
    # use a map-reduce style summarisation pass before producing the profile.
    long_novel_threshold_chars: int = 400_000

    # --- Output ---
    output_root: Path = field(default_factory=lambda: Path("./output"))

    #def validate(self) -> None:
     #   missing = []
      #  if not self.anthropic_api_key:
       #     missing.append("ANTHROPIC_API_KEY")
        #if not self.openai_api_key:
         #   missing.append("OPENAI_API_KEY")
       # if not self.elevenlabs_api_key:
        #    missing.append("ELEVENLABS_API_KEY")
        #if not self.replicate_api_token:
         #   missing.append("REPLICATE_API_TOKEN")
        #if missing:
         #   raise RuntimeError(
          #      f"Missing environment variables: {', '.join(missing)}. "
           #     "Copy .env.example to .env and fill them in."
           # )
    def validate(self) -> None:
        if not self.minimax_paygo_key:
            raise RuntimeError(
                "Missing environment variable: MINIMAX_PAYGO_KEY. "
                "Please fill it in your .env file."
            )
