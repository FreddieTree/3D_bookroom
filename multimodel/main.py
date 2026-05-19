"""CLI entry point.

Example:
    python main.py path/to/novel.epub --output ./output
    python main.py path/to/novel.txt --output ./output --max-chapters 3
"""
from __future__ import annotations

import argparse
from pathlib import Path

from config import Config
from orchestrator import BookEnricher


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI-enrich a novel (epub/pdf/txt) with per-chapter illustrations, "
                    "character voice acting, and ambient music."
    )
    parser.add_argument("source", type=Path, help="Path to .epub, .pdf, or .txt file")
    parser.add_argument("--output", type=Path, default=Path("./output"),
                        help="Output root directory (default: ./output)")
    parser.add_argument("--max-chapters", type=int, default=None,
                        help="Only process the first N chapters (useful for testing). "
                             "If passed, the interactive chapter-count prompt is skipped.")
    parser.add_argument("--no-interactive", action="store_true",
                        help="Skip the post-parse prompt asking how many chapters "
                             "to generate; just use all chapters (or --max-chapters).")
    parser.add_argument("--no-skip", action="store_true",
                        help="Regenerate everything even if files exist")
    parser.add_argument("--chapter-workers", type=int, default=2,
                        help="Parallel chapter workers (default: 2)")
    parser.add_argument("--music-seconds", type=int, default=30,
                        help="Music clip length in seconds (default: 30)")
    parser.add_argument("--max-dialogues", type=int, default=5,
                        help="Max dialogues to voice per chapter (default: 5)")
    parser.add_argument("--no-people", action="store_true",
                        help="Generate environment-only illustrations. No human "
                             "figures, faces, or silhouettes. Skips character "
                             "portrait pre-generation too (no point).")
    parser.add_argument("--no-portraits", action="store_true",
                        help="Skip the one-off character reference portrait stage. "
                             "Chapter illustrations will still depict people but "
                             "without character-consistency reference images.")
    args = parser.parse_args()

    cfg = Config()
    cfg.output_root = args.output
    cfg.max_chapters = args.max_chapters
    cfg.skip_existing = not args.no_skip
    cfg.concurrent_chapter_workers = args.chapter_workers
    cfg.music_duration_seconds = args.music_seconds
    cfg.max_dialogues_per_chapter = args.max_dialogues
    cfg.interactive = not args.no_interactive
    cfg.include_people_in_scenes = not args.no_people
    # If user explicitly disabled people, also disable portraits (would be wasted).
    cfg.generate_character_portraits = (
        not args.no_portraits and not args.no_people
    )
    # If user already expressed an image-mode preference via CLI flags,
    # skip the interactive prompt about it. Otherwise the orchestrator
    # will ask them when running interactively.
    cfg.skip_image_mode_prompt = args.no_people or args.no_portraits

    BookEnricher(cfg).enrich(args.source)


if __name__ == "__main__":
    main()
