"""Pipeline orchestrator. Ties parsers, analyzers and generators together.

Public entry point:  enrich_book(path, config) -> output dir

Flow:
  1. parse_book(path)                                  → Book
  2. (TXT/PDF only) if chapter split looks suspicious, ask MiniMax to
     re-detect chapter boundaries on the raw text                → Book
  3. Show user the detected chapter list; if interactive, prompt for
     how many chapters to actually generate                       → Book
  4. StoryAnalyzer.analyze(book)                       → StoryProfile
  5. ElevenLabsVoiceCaster.cast(profile)               → mutates profile w/ voice_ids
  6. Persist story_profile.json + voice_cast.json
  7. For each chapter (parallel across chapters):
       a. ChapterAnalyzer.plan(chapter, profile)       → ChapterPlan
       b. Persist plan.json
       c. In parallel: image, music, all dialogues
       d. Persist dialogues.json mapping each audio file → its text /
          character / voice_id / emotion (so downstream code can sync
          audio playback to the source text easily)
"""
from __future__ import annotations

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional, Tuple
from models import StoryProfile, ChapterPlan, Book, Chapter, Character
from tqdm import tqdm

from analyzer import ChapterAnalyzer, StoryAnalyzer
from chapter_detector import LLMChapterDetector, is_suspicious
from config import Config
from generators import (
    ElevenLabsVoiceCaster,
    ElevenLabsVoiceGenerator,
    OpenAIImageGenerator,
    ReplicateMusicGenerator,
    MockImageGenerator,
    MockVoiceCaster,
    MockVoiceGenerator,
    MockMusicGenerator,
    MiniMaxVoiceCaster,
    MiniMaxVoiceGenerator,
    MiniMaxImageGenerator,
    MiniMaxMusicGenerator
)
from analyzer import ChapterAnalyzer, StoryAnalyzer, MockStoryAnalyzer, MockChapterAnalyzer
from parsers import parse_book


def _safe_filename(name: str, max_len: int = 40) -> str:
    name = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", name).strip("_")
    return name[:max_len] or "untitled"


class BookEnricher:
    def __init__(self, config: Config):
        config.validate()
        self.config = config

    # --------------------------- public API ---------------------------

    def enrich(self, source_path: str | Path) -> Path:
        book = parse_book(source_path)
        print(f"📖 Parsed: {book.title} — {len(book.chapters)} chapter(s), "
              f"{book.total_word_count:,} words")

        # If parser-side chapter detection looks unreliable (TXT/PDF), fall
        # back to MiniMax to re-detect chapter boundaries on the raw text.
        book = self._maybe_redetect_chapters(book)

        # Show what we've got and (if interactive) let the user pick how
        # many chapters to enrich. Honors --max-chapters non-interactively.
        book = self._select_chapters_to_process(book)

        # Ask whether chapter illustrations should depict people / faces,
        # and whether to spend on character reference portraits. Skipped
        # when CLI flags already settled it or we're non-interactive.
        self._select_image_mode()

        book_dir = self.config.output_root / _safe_filename(book.title)
        chapters_dir = book_dir / "chapters"
        chapters_dir.mkdir(parents=True, exist_ok=True)

        # ----- Stage 1: global understanding -----
        profile = self._load_or_build_profile(book, book_dir)

        # ----- Voice casting (once, then locked) -----
        profile = self._load_or_cast_voices(profile, book_dir)

        # ----- Character portrait pre-generation (once, then locked) -----
        # This produces a public CDN URL per character that subsequent
        # chapter illustrations will reuse as `subject_reference`, so
        # 甄嬛 looks like the same 甄嬛 in every chapter. Skipped if the
        # user disabled portraits OR people-in-scenes (no point paying
        # for portraits we'll never use).
        if self.config.generate_character_portraits and self.config.include_people_in_scenes:
            profile = self._load_or_generate_portraits(profile, book_dir)
        else:
            print("🎨 跳过角色肖像生成（按配置）")

        # Wire up generators with the locked profile
        image_gen = MiniMaxImageGenerator(self.config, profile)
        music_gen = MiniMaxMusicGenerator(self.config, profile)
        voice_gen = MiniMaxVoiceGenerator(self.config)

        voice_map = {c.name: (c.voice_id, c.voice_name) for c in profile.characters}
        portrait_map = {
            c.name: c.portrait_url for c in profile.characters if c.portrait_url
        }
        # alias → canonical for dialogue lookup
        alias_to_canonical = {}
        for c in profile.characters:
            for a in c.aliases:
                alias_to_canonical[a] = c.name

        chapter_analyzer = ChapterAnalyzer(self.config)

        # ----- Stage 2: per-chapter generation -----
        total = len(book.chapters)
        for idx, ch in enumerate(book.chapters):
            print(f"[{idx+1}/{total}] {ch.title}", flush=True)
            try:
                self._process_chapter(
                    ch,
                    profile,
                    chapter_analyzer,
                    image_gen,
                    music_gen,
                    voice_gen,
                    voice_map,
                    portrait_map,
                    alias_to_canonical,
                    chapters_dir,
                )
            except Exception as e:
                print(f"⚠️  Chapter {ch.index + 1} ({ch.title}) failed: {e}", flush=True)

        print(f"✅ Done. Output in {book_dir}")
        return book_dir

    # --------------------------- stage 0: chapter sanity ---------------------------

    def _maybe_redetect_chapters(self, book: Book) -> Book:
        """If the parser's chapter detection looks suspicious, ask MiniMax
        to re-detect chapter boundaries from the raw text.

        Only runs for TXT / PDF (EPUB has explicit chapter structure, we
        trust it). Returns either the original book or a new one with
        re-detected chapters.
        """
        if book.source_format == "epub":
            return book
        if book.raw_full_text is None:
            return book

        total = len(book.raw_full_text)
        suspicious, reason = is_suspicious(book.chapters, total)
        if not suspicious:
            return book

        print(f"⚠️  Heuristic chapter split looks unreliable ({reason}).")
        print("    Asking MiniMax to re-detect chapter boundaries…")
        try:
            detector = LLMChapterDetector(self.config)
            splits = detector.detect(book.raw_full_text)
        except Exception as e:
            print(f"    LLM 章节探测失败，沿用原始切分: {e}")
            return book

        # If the LLM essentially confirmed the original (one big chapter),
        # don't disrupt; keep what we had.
        if len(splits) <= 1 and len(book.chapters) >= 1:
            print("    LLM 也未识别到清晰章节，沿用原始切分。")
            return book

        new_chapters = []
        from parsers import _count_words  # reuse the cross-script word count
        for i, (title, content) in enumerate(splits):
            new_chapters.append(Chapter(
                index=i,
                title=title,
                content=content,
                word_count=_count_words(content),
            ))
        book.chapters = new_chapters
        print(f"    ✓ MiniMax 重新识别出 {len(new_chapters)} 章。")
        return book

    def _select_chapters_to_process(self, book: Book) -> Book:
        """Trim book.chapters down to what the user actually wants generated.

        Resolution order (first match wins):
          1. --max-chapters CLI flag (config.max_chapters) → use that.
          2. interactive=False or non-TTY                  → use all.
          3. Otherwise                                     → ask the user.

        Always prints a chapter preview so the user can see what was parsed.
        """
        self._print_chapter_overview(book)

        # Honour explicit CLI flag without prompting.
        if self.config.max_chapters is not None:
            n = min(self.config.max_chapters, len(book.chapters))
            book.chapters = book.chapters[:n]
            print(f"   (limited to first {n} chapters via --max-chapters)")
            return book

        # Skip the prompt in non-interactive runs (CI, piped stdin, etc.).
        if not self.config.interactive or not sys.stdin.isatty():
            return book

        # Interactive prompt. Be forgiving of bad input.
        total = len(book.chapters)
        while True:
            try:
                raw = input(
                    f"\n📚 检测到 {total} 章。要生成多少章？"
                    f"(输入 1-{total} 的数字，回车=全部，q=退出): "
                ).strip()
            except EOFError:
                return book
            if raw == "" or raw.lower() in {"all", "全部"}:
                return book
            if raw.lower() in {"q", "quit", "exit"}:
                print("已取消。")
                sys.exit(0)
            try:
                n = int(raw)
            except ValueError:
                print("   请输入数字。")
                continue
            if n < 1 or n > total:
                print(f"   请输入 1 到 {total} 之间的数字。")
                continue
            book.chapters = book.chapters[:n]
            print(f"   ✓ 将生成前 {n} 章。")
            return book

    def _select_image_mode(self) -> None:
        """Interactive prompt for the people-in-images decisions.

        Two boolean settings on the config:
          - include_people_in_scenes  → are humans allowed in chapter images?
          - generate_character_portraits → spend on one-off reference portraits?

        Resolution order (first match wins):
          1. --no-people / --no-portraits CLI flags passed → skip prompt,
             use whatever main.py already set.
          2. Non-interactive run (no TTY or --no-interactive)  → use defaults.
          3. Otherwise prompt the user.
        """
        if self.config.skip_image_mode_prompt:
            print(
                "🎨 图像模式：按命令行参数 "
                f"include_people={self.config.include_people_in_scenes}, "
                f"portraits={self.config.generate_character_portraits}"
            )
            return
        if not self.config.interactive or not sys.stdin.isatty():
            return

        # Q1: depict people at all?
        while True:
            try:
                raw = input(
                    "\n🎨 章节插图是否包含人物 / 人脸？\n"
                    "   y = 是（推荐：场景里出现的角色会被画出来）\n"
                    "   n = 否（只画环境 / 物件 / 氛围，不画任何人脸）\n"
                    "   (y/n，回车=y): "
                ).strip().lower()
            except EOFError:
                return
            if raw in ("", "y", "yes", "是"):
                self.config.include_people_in_scenes = True
                break
            if raw in ("n", "no", "否"):
                self.config.include_people_in_scenes = False
                # No people → portraits would be wasted spend
                self.config.generate_character_portraits = False
                print("   ✓ 章节图只画环境，跳过角色肖像生成。")
                return
            print("   请输入 y 或 n。")

        # Q2: spend on character reference portraits?
        while True:
            try:
                raw = input(
                    "\n🖼  是否为每个角色一次性生成「参考肖像」？\n"
                    "   y = 是（每角色加 1 张图的成本，换跨章节角色长相一致）\n"
                    "   n = 否（省钱；每章人物可能长得略有不同）\n"
                    "   (y/n，回车=y): "
                ).strip().lower()
            except EOFError:
                return
            if raw in ("", "y", "yes", "是"):
                self.config.generate_character_portraits = True
                print("   ✓ 章节图将包含人物；先为每个角色生成参考肖像。")
                return
            if raw in ("n", "no", "否"):
                self.config.generate_character_portraits = False
                print("   ✓ 章节图将包含人物；不生成参考肖像。")
                return
            print("   请输入 y 或 n。")

    def _print_chapter_overview(self, book: Book) -> None:
        """Pretty-print the detected chapter list (first/last few if long)."""
        chs = book.chapters
        total = len(chs)
        print(f"\n📑 章节清单（共 {total} 章）：")
        # Show up to first 8 and last 3 to keep the terminal manageable.
        if total <= 12:
            preview = list(chs)
        else:
            preview = list(chs[:8]) + [None] + list(chs[-3:])
        for ch in preview:
            if ch is None:
                print(f"   …  (中间 {total - 11} 章省略)  …")
                continue
            title = ch.title.strip().replace("\n", " ")
            if len(title) > 40:
                title = title[:38] + "…"
            print(f"   ch{ch.index + 1:03d}  {title:<40}  {ch.word_count:>7,} 字")

    # --------------------------- stage 1 ---------------------------

    def _load_or_build_profile(self, book: Book, book_dir: Path) -> StoryProfile:
        profile_path = book_dir / "story_profile.json"
        if self.config.skip_existing and profile_path.exists():
            print("🗂  Loading cached story profile")
            return StoryProfile.model_validate_json(profile_path.read_text(encoding="utf-8"))

        print("🧠 Reading the whole book — building style bible…")
        analyzer = StoryAnalyzer(self.config)
        #analyzer = MockStoryAnalyzer(self.config)
        profile = analyzer.analyze(book)
        profile_path.write_text(
            profile.model_dump_json(indent=2),
            encoding="utf-8",
        )
        print(f"   Art style: {profile.art_style[:120]}…")
        print(f"   Music baseline: {profile.music_baseline[:120]}…")
        print(f"   Characters detected: {len(profile.characters)}")
        return profile

    def _load_or_cast_voices(self, profile: StoryProfile, book_dir: Path) -> StoryProfile:
        cast_path = book_dir / "voice_cast.json"
        if self.config.skip_existing and cast_path.exists():
            cast = json.loads(cast_path.read_text(encoding="utf-8"))
            for c in profile.characters:
                rec = cast.get(c.name)
                if rec:
                    c.voice_id = rec.get("voice_id")
                    c.voice_name = rec.get("voice_name")
            return profile

        if not profile.characters:
            cast_path.write_text("{}", encoding="utf-8")
            return profile

        print("🎙  Casting voices…")
        #caster = ElevenLabsVoiceCaster(self.config)
        #caster = MockVoiceCaster()
        caster = MiniMaxVoiceCaster(self.config)
        caster.cast(profile)
        cast_record = {
            c.name: {"voice_id": c.voice_id, "voice_name": c.voice_name}
            for c in profile.characters
        }
        cast_path.write_text(json.dumps(cast_record, indent=2, ensure_ascii=False), encoding="utf-8")
        # also persist the refreshed profile (now with voice ids)
        (book_dir / "story_profile.json").write_text(
            profile.model_dump_json(indent=2), encoding="utf-8"
        )
        for c in profile.characters:
            print(f"   {c.name} → {c.voice_name} ({c.voice_id})")
        return profile

    # --------------------------- stage 1b: portraits ---------------------------

    def _load_or_generate_portraits(self, profile: StoryProfile, book_dir: Path) -> StoryProfile:
        """Generate one reference portrait per character, persist a small
        registry mapping name → portrait_url + portrait_path. Subsequent
        chapter image calls will pull URLs out of this registry to keep
        characters visually consistent across the book.

        Cached: on re-runs we load the saved registry and skip the API
        calls entirely. To force regeneration, delete portraits.json or
        pass --no-skip.
        """
        from generators import MiniMaxCharacterPortraitGenerator

        portraits_dir = book_dir / "portraits"
        registry_path = book_dir / "portraits.json"

        # ---- Try cache ----
        if self.config.skip_existing and registry_path.exists():
            try:
                cached = json.loads(registry_path.read_text(encoding="utf-8"))
                hit = 0
                for c in profile.characters:
                    rec = cached.get(c.name)
                    if rec:
                        c.portrait_url = rec.get("portrait_url")
                        c.portrait_path = rec.get("portrait_path")
                        if c.portrait_url:
                            hit += 1
                print(f"🎨 缓存命中：{hit}/{len(profile.characters)} 张角色肖像沿用上次结果")
                if hit == len(profile.characters):
                    return profile
                # Otherwise fall through and fill the missing ones below.
            except Exception as e:
                print(f"   读取肖像缓存失败，重新生成: {e}")

        if not profile.characters:
            return profile

        portraits_dir.mkdir(parents=True, exist_ok=True)
        gen = MiniMaxCharacterPortraitGenerator(self.config, profile)
        print(f"🎨 生成 {len(profile.characters)} 张角色参考肖像（一次性，后续章节将复用）…")

        def _one(c: Character) -> Tuple[Character, Optional[str], Optional[Path], Optional[str]]:
            """Returns (character, url, local_path, error)."""
            if c.portrait_url and c.portrait_path:
                # Already filled from cache
                return c, c.portrait_url, Path(c.portrait_path), None
            safe = _safe_filename(c.name, 24)
            p = portraits_dir / f"{safe}.png"
            try:
                _path, url = gen.generate(c, p)
                return c, url, _path, None
            except Exception as e:
                return c, None, None, str(e)

        with ThreadPoolExecutor(
            max_workers=max(self.config.concurrent_voices_per_chapter, 3)
        ) as pool:
            futs = {pool.submit(_one, c): c for c in profile.characters}
            for f in as_completed(futs):
                c, url, path, err = f.result()
                if err:
                    print(f"   ⚠️  {c.name} 肖像生成失败: {err}")
                    continue
                c.portrait_url = url
                c.portrait_path = str(path.relative_to(book_dir)) if path else None
                print(f"   ✓ {c.name} → {c.portrait_path}")

        # ---- Persist registry + refreshed profile ----
        registry = {
            c.name: {
                "portrait_url": c.portrait_url,
                "portrait_path": c.portrait_path,
            }
            for c in profile.characters
        }
        registry_path.write_text(
            json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        (book_dir / "story_profile.json").write_text(
            profile.model_dump_json(indent=2), encoding="utf-8"
        )
        return profile

    # --------------------------- stage 2 ---------------------------

    def _process_chapter(
        self,
        chapter: Chapter,
        profile: StoryProfile,
        chapter_analyzer: ChapterAnalyzer,
        image_gen: "MiniMaxImageGenerator",
        music_gen: "MiniMaxMusicGenerator",
        voice_gen: "MiniMaxVoiceGenerator",
        voice_map: dict,
        portrait_map: dict,
        alias_to_canonical: dict,
        chapters_dir: Path,
    ) -> None:
        ch_dir = chapters_dir / f"ch{chapter.index + 1:03d}"
        ch_dir.mkdir(parents=True, exist_ok=True)
        voices_dir = ch_dir / "voices"
        voices_dir.mkdir(parents=True, exist_ok=True)

        plan_path = ch_dir / "plan.json"
        if self.config.skip_existing and plan_path.exists():
            plan = ChapterPlan.model_validate_json(plan_path.read_text(encoding="utf-8"))
        else:
            plan = chapter_analyzer.plan(chapter, profile)
            plan_path.write_text(plan.model_dump_json(indent=2), encoding="utf-8")

        image_path = ch_dir / "illustration.png"
        music_path = ch_dir / f"music.{self.config.music_format}"

        # Status flags for image / music — start optimistic, only get marked
        # 'failed' if a task throws below.
        image_status = "cached" if (self.config.skip_existing and image_path.exists()) else "pending"
        music_status = "cached" if (self.config.skip_existing and music_path.exists()) else "pending"

        # ----- Pre-build the dialogue record list. -----
        # Every dialogue from the plan gets a record, even if we won't synthesise
        # it (no voice cast / cached / skipped). That way the downstream
        # consumer sees a complete picture of "what audio corresponds to what
        # text" with no gaps in the manifest.
        dialogue_records: list[dict] = []
        future_to_record: dict = {}

        # We'll defer task submission until we're inside the executor so we
        # can keep references straight. Build the plan first.
        dialogue_tasks: list[tuple[dict, callable]] = []

        for i, line in enumerate(plan.key_dialogues):
            canonical = alias_to_canonical.get(line.character, line.character)
            voice_info = voice_map.get(canonical)
            voice_id = voice_info[0] if voice_info else None
            voice_name = voice_info[1] if voice_info else None
            audio_filename = f"{i + 1:02d}_{_safe_filename(canonical, 24)}.mp3"
            audio_relpath = f"voices/{audio_filename}"
            v_path = voices_dir / audio_filename

            record = {
                "order": i + 1,
                "character_canonical": canonical,
                "character_as_written": line.character,
                "text": line.text,
                "emotion": line.emotion,
                "voice_id": voice_id,
                "voice_name": voice_name,
                "audio_path": audio_relpath,        # relative to the chapter dir
                "audio_filename": audio_filename,
                "status": "pending",                # one of: ok, cached, failed, skipped_no_voice
            }

            if not voice_info:
                record["status"] = "skipped_no_voice"
            elif self.config.skip_existing and v_path.exists():
                record["status"] = "cached"
            else:
                # Bind values into the lambda to avoid late-binding bugs.
                dialogue_tasks.append((
                    record,
                    lambda l=line, vid=voice_id, p=v_path: voice_gen.synthesize(l, vid, p),
                ))
            dialogue_records.append(record)

        # ----- Run image / music / dialogues in parallel within the chapter. -----
        with ThreadPoolExecutor(
            max_workers=max(self.config.concurrent_voices_per_chapter, 3)
        ) as pool:
            future_kind: dict = {}  # future -> ('image'|'music'|'voice', record_or_None)

            # Resolve which character portraits to attach as subject_reference.
            # Only the characters the analyzer said appear in the image AND
            # who have a portrait_url get attached. The image generator caps
            # how many it'll actually send and falls back gracefully if any
            # URL is rejected.
            include_people = bool(
                self.config.include_people_in_scenes and plan.image_has_people
            )
            chapter_refs: list = []
            if include_people:
                for canon_name in plan.image_characters:
                    url = portrait_map.get(canon_name)
                    if url and url not in chapter_refs:
                        chapter_refs.append(url)

            if image_status != "cached":
                f = pool.submit(
                    image_gen.generate,
                    plan.image_focus,
                    plan.image_scene_details,
                    image_path,
                    chapter_refs or None,
                    include_people,
                )
                future_kind[f] = ("image", None)

            if music_status != "cached":
                f = pool.submit(music_gen.generate, plan.music_mood, music_path)
                future_kind[f] = ("music", None)

            for record, fn in dialogue_tasks:
                f = pool.submit(fn)
                future_kind[f] = ("voice", record)

            for fut in as_completed(future_kind):
                kind, record = future_kind[fut]
                try:
                    fut.result()
                    if kind == "image":
                        image_status = "ok"
                    elif kind == "music":
                        music_status = "ok"
                    elif kind == "voice":
                        record["status"] = "ok"
                except Exception as e:
                    if kind == "image":
                        image_status = "failed"
                    elif kind == "music":
                        music_status = "failed"
                    elif kind == "voice":
                        record["status"] = "failed"
                        record["error"] = str(e)
                    label = kind if kind != "voice" else f"voice[{record['order']}] {record['character_canonical']}"
                    print(f"   ⚠️  ch{chapter.index + 1} {label}: {e}")

        # ----- Persist the chapter manifest. -----
        # This is the single source of truth a downstream player / web app
        # needs: it maps every generated asset (illustration, music, each
        # voice clip) to the chapter and to the specific text it represents,
        # so audio can be lined up against the source prose without parsing
        # filenames.
        manifest = {
            "chapter_index": chapter.index,
            "chapter_number": chapter.index + 1,    # 1-based for humans
            "chapter_title": chapter.title,
            "chapter_summary": plan.chapter_summary,
            "word_count": chapter.word_count,
            "illustration": {
                "path": "illustration.png",
                "image_focus": plan.image_focus,
                "image_scene_details": plan.image_scene_details,
                "has_people": include_people,
                "characters": plan.image_characters if include_people else [],
                "reference_portraits_used": len(chapter_refs),
                "status": image_status,
            },
            "music": {
                "path": f"music.{self.config.music_format}",
                "music_mood": plan.music_mood,
                "status": music_status,
            },
            "dialogues": dialogue_records,
        }
        (ch_dir / "chapter_manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def enrich_book(source_path: str | Path, config: Optional[Config] = None) -> Path:
    """Convenience function for programmatic use."""
    config = config or Config()
    return BookEnricher(config).enrich(source_path)
