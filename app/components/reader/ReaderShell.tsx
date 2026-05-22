"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bookmark, MessagesSquare, Mic, Palette } from "lucide-react";

import { ChatDrawer } from "@/app/components/chat/ChatDrawer";
import { ParagraphVisualAlbum } from "@/app/components/multimodal/ParagraphVisualAlbum";
import { ChapterTransition } from "@/app/components/reader/ChapterTransition";
import { ImmersiveReadChrome } from "@/app/components/reader/ImmersiveReadChrome";
import { ReaderBgmStrip } from "@/app/components/reader/ReaderBgmStrip";
import { ReaderFloatingMic } from "@/app/components/reader/ReaderFloatingMic";
import { ReaderParagraphBlock } from "@/app/components/reader/ReaderParagraphBlock";
import {
  pickParagraphOrnament,
  ReaderParagraphDivider,
} from "@/app/components/reader/ReaderParagraphDivider";
import { ReaderParagraphReveal } from "@/app/components/reader/ReaderParagraphReveal";
import {
  ReaderBouncingLabel,
  ReaderSpineLoading,
} from "@/app/components/reader/reader-loaders";
import { ReaderReadingSettingsModal } from "@/app/components/reader/ReaderReadingSettingsModal";
import { ReaderTopChrome } from "@/app/components/reader/ReaderTopChrome";
import { ReaderVoiceBubbles } from "@/app/components/reader/ReaderVoiceBubbles";
import { ReadingProgressBackgroundSync } from "@/app/components/reader/ReadingProgressBackgroundSync";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import type { BookMeta } from "@/app/lib/data/books";
import { getBookById } from "@/app/lib/data/books";
import type { ChapterContent, Paragraph } from "@/app/lib/data/sample-content";
import { fetchMergedBookChapters } from "@/app/lib/reader/fetch-merged-book-chapters";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import {
  demoDisplayChapterTitle,
  mockStreamAiReplyThoughtful,
  mockVoiceAiReply,
  mockVoiceTranscriptNearParagraph,
} from "@/app/lib/mock/reading";
import { throttle } from "@/app/lib/utils/throttle";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";
import { useAppStore } from "@/app/lib/stores/appStore";
import { useReaderStore } from "@/app/lib/stores/readerStore";

type WindowTimerHandle = number;

const LONG_PRESS_MS = 500;
const CHAT_EDGE_PX_FROM_RIGHT = 56;
const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22] as const;

function paragraphOffsetInScroll(
  scrollEl: HTMLElement,
  paragraphId: string,
): number | null {
  const target = scrollEl.querySelector(
    `[data-paragraph-id="${CSS.escape(paragraphId)}"]`,
  ) as HTMLElement | null;
  if (!target) return null;
  const scrollRect = scrollEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return targetRect.top - scrollRect.top + scrollEl.scrollTop;
}

function scrollContentToParagraph(
  scrollEl: HTMLElement,
  paragraphId: string,
  behavior: ScrollBehavior = "auto",
) {
  const top = paragraphOffsetInScroll(scrollEl, paragraphId);
  if (top == null) return;
  scrollEl.scrollTo({ top: Math.max(0, top - 12), behavior });
}

function pickParagraphIdInView(
  scrollEl: HTMLElement,
  ids: string[],
): string | null {
  if (!ids.length) return null;
  const probe = scrollEl.scrollTop + scrollEl.clientHeight * 0.3;
  let active = ids[0]!;
  for (const id of ids) {
    const top = paragraphOffsetInScroll(scrollEl, id);
    if (top == null) continue;
    if (top <= probe + 8) active = id;
    else break;
  }
  return active;
}

type ReaderShellProps = {
  bookId: string;
  openParagraphId?: string | null;
  openChapterIndex?: number | null;
  fromCover?: boolean;
  /** 服务端从 Mongo 映射；缺省则用 `BOOKS`。 */
  bookMeta?: BookMeta | null;
};

type BubbleTurn = {
  userText: string;
  aiText: string;
  streaming: boolean;
};

export function ReaderShell({
  bookId,
  openParagraphId = null,
  openChapterIndex = null,
  fromCover = false,
  bookMeta,
}: ReaderShellProps) {
  const book = bookMeta ?? getBookById(bookId);

  const [chapterPack, setChapterPack] = useState<{
    bookId: string;
    chapters: ChapterContent[];
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchMergedBookChapters(bookId).then((chs) => {
      if (!alive) return;
      setChapterPack({ bookId, chapters: chs });
    });
    return () => {
      alive = false;
    };
  }, [bookId]);

  /** `null` = 本条 `bookId` 尚未拉回正文；或与当前 bookId 不一致（切换书目瞬间）。 */
  const chapters =
    chapterPack?.bookId === bookId ? chapterPack.chapters : null;

  const chaptersList = chapters ?? [];
  const { back, toMap, toFinished } = useNavigation();
  const router = useRouter();

  const readerProgressSlice = useReaderStore((s) => s.progressByBook[bookId]);

  const sweepAppReadingAnchor = useAppStore((s) => s.setReadingAnchor);

  const setReadingAnchor = useCallback(
    (chapterIdx: number, paragraphId: string | null) => {
      useReaderStore.getState().setReadingPosition(bookId, {
        chapterIndex: chapterIdx,
        paragraphId,
      });
      sweepAppReadingAnchor(bookId, chapterIdx, paragraphId);
    },
    [bookId, sweepAppReadingAnchor],
  );

  useEffect(() => {
    useAppStore.getState().setCurrentBookId(bookId);
  }, [bookId]);

  const openChat = useAppStore((s) => s.openChat);
  const isChatOpen = useAppStore((s) => s.isChatOpen);
  const releasePending = useAppStore((s) => s.releasePending);
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const paragraphVisualsByBook = useAppStore((s) => s.paragraphVisualsByBook);

  const fontSize = useAppStore((s) => s.readerSettings.fontSize);
  const brightness = useAppStore((s) => s.readerSettings.brightness);
  const reducedMotion = useReducedMotion();
  const readingDisplayMode = useAppStore(
    (s) => s.readerSettings.readingDisplayMode,
  );
  const readSpeed = useAppStore((s) => s.readerSettings.readSpeed);

  const [chapterIndex, setChapterIndex] = useState(0);
  const prevChapterForAnim = useRef(chapterIndex);
  const [chapterDir, setChapterDir] = useState(1);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [chapterEndVisible, setChapterEndVisible] = useState(false);
  const [immersivePlaying, setImmersivePlaying] = useState(true);
  const [expandedAlbumFor, setExpandedAlbumFor] = useState<string | null>(null);

  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false);
  const [micProcessing, setMicProcessing] = useState(false);
  const [bubbleTurn, setBubbleTurn] = useState<BubbleTurn | null>(null);
  const [scrollProgressPct, setScrollProgressPct] = useState(0);

  const revealedParasRef = useRef(new Set<string>());
  const headerIdleTimerRef = useRef<WindowTimerHandle | null>(
    null,
  );
  const [readerDeepFocus, setReaderDeepFocus] = useState(false);

  const coverFadeStarted = useRef(false);

  const [menu, setMenu] = useState<{
    paragraph: Paragraph;
    x: number;
    y: number;
  } | null>(null);

  const [pressingId, setPressingId] = useState<string | null>(null);

  const contentScrollRef = useRef<HTMLElement>(null);
  const scrollPersistTimer = useRef<WindowTimerHandle | null>(
    null,
  );
  const swipeGestureStart = useRef<{ x: number; y: number } | null>(null);

  const anchorDebounce = useRef<number | null>(null);

  const pressTimer = useRef<WindowTimerHandle | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const chapter = chaptersList[chapterIndex] ?? null;
  const totalChapters = chaptersList.length;

  const scheduleAnchor = useCallback(
    (paraId: string) => {
      if (anchorDebounce.current) clearTimeout(anchorDebounce.current);
      anchorDebounce.current = window.setTimeout(() => {
        setReadingAnchor(chapterIndex, paraId);
        anchorDebounce.current = null;
      }, 300);
    },
    [chapterIndex, setReadingAnchor],
  );

  useEffect(
    () => () => {
      if (anchorDebounce.current) clearTimeout(anchorDebounce.current);
    },
    [],
  );

  useEffect(() => {
    useReaderStore.getState().setActiveBookId(bookId);
  }, [bookId]);

  useEffect(() => {
    if (chapters === null || chapters.length === 0) return;

    const hasExplicitChapterEntry =
      openParagraphId != null ||
      (openChapterIndex != null &&
        Number.isFinite(openChapterIndex) &&
        openChapterIndex >= 0);

    const applyChapterFromStore = () => {
      if (hasExplicitChapterEntry) return;
      const raw =
        useReaderStore.getState().progressByBook[bookId]?.chapterIndex ?? 0;
      setChapterIndex(
        Math.min(Math.max(0, raw), chapters.length - 1),
      );
    };

    if (useReaderStore.persist.hasHydrated()) {
      queueMicrotask(applyChapterFromStore);
    }

    return useReaderStore.persist.onFinishHydration(() => {
      applyChapterFromStore();
    });
  }, [bookId, chapters, openParagraphId, openChapterIndex]);

  useEffect(() => {
    const prev = prevChapterForAnim.current;
    if (chapterIndex !== prev) {
      if (chapterIndex > prev) setChapterDir(1);
      else setChapterDir(-1);
      prevChapterForAnim.current = chapterIndex;
    }
  }, [chapterIndex]);

  const mergedProgressPct = useMemo(() => {
    if (!chapter) return 5;
    const activeParagraphId =
      readerProgressSlice?.paragraphId ??
      chapter.paragraphs[0]?.id ??
      "";

    const paraIdx =
      activeParagraphId && chapter.paragraphs.length > 0
        ? chapter.paragraphs.findIndex((p) => p.id === activeParagraphId)
        : 0;

    const paraFrac =
      chapter.paragraphs.length > 0
        ? Math.min(
            100,
            Math.max(
              4,
              ((paraIdx >= 0 ? paraIdx + 1 : 1) /
                chapter.paragraphs.length) *
                100,
            ),
          )
        : 5;

    if (chapterEndVisible) return 100;
    return Math.round(
      Math.min(100, paraFrac * 0.62 + scrollProgressPct * 0.38),
    );
  }, [chapter, readerProgressSlice?.paragraphId, scrollProgressPct, chapterEndVisible]);

  useEffect(() => {
    revealedParasRef.current.clear();
  }, [chapterIndex, bookId]);

  useEffect(() => {
    if (readingDisplayMode !== "standard") {
      return;
    }
    const tid = window.setTimeout(() => {
      setReaderDeepFocus(true);
    }, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(tid);
      queueMicrotask(() => setReaderDeepFocus(false));
    };
  }, [readingDisplayMode, bookId]);

  useEffect(() => {
    if (!readerDeepFocus) return;
    const quit = () => setReaderDeepFocus(false);
    window.addEventListener("touchstart", quit, true);
    window.addEventListener("pointerdown", quit, true);
    return () => {
      window.removeEventListener("touchstart", quit, true);
      window.removeEventListener("pointerdown", quit, true);
    };
  }, [readerDeepFocus]);

  useEffect(() => {
    const headerTimer = headerIdleTimerRef.current;
    return () => {
      if (headerTimer) window.clearTimeout(headerTimer);
    };
  }, []);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el || !chapter) return;

    const runContentScroll = () => {
      setHeaderVisible(true);

      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      const y = el.scrollTop;
      const scrollPct =
        maxScroll <= 8
          ? 100
          : Math.min(100, Math.max(0, (y / maxScroll) * 100));

      const nearEnd = maxScroll <= 8 || y >= maxScroll - 48;
      setScrollProgressPct(nearEnd ? 100 : scrollPct);
      setChapterEndVisible(nearEnd);

      const ids = chapter.paragraphs.map((p) => p.id);
      const pid = pickParagraphIdInView(el, ids);
      if (pid) scheduleAnchor(pid);

      if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
      scrollPersistTimer.current = window.setTimeout(() => {
        useReaderStore.getState().setScrollOffset(bookId, Math.round(y));
      }, 520);
    };

    const throttled = throttle(runContentScroll, 100);

    el.addEventListener("scroll", throttled, { passive: true });
    queueMicrotask(() => queueMicrotask(runContentScroll));
    return () => {
      if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
      el.removeEventListener("scroll", throttled as EventListener);
    };
  }, [bookId, chapter, scheduleAnchor]);

  useEffect(() => {
    if (!openParagraphId || chapters === null || chapters.length === 0) return;
    const chIdx = chapters.findIndex((ch) =>
      ch.paragraphs.some((p) => p.id === openParagraphId),
    );
    if (chIdx < 0) return;
    queueMicrotask(() => {
      setChapterIndex(chIdx);
      setReadingAnchor(chIdx, openParagraphId);
    });
    const t = window.setTimeout(() => {
      const el = contentScrollRef.current;
      if (el && openParagraphId) {
        scrollContentToParagraph(el, openParagraphId, "smooth");
      }
    }, 200);
    router.replace(`/book/${bookId}/read`, { scroll: false });
    return () => window.clearTimeout(t);
  }, [
    openParagraphId,
    bookId,
    chapters,
    setReadingAnchor,
    router,
  ]);

  useEffect(() => {
    if (
      openParagraphId != null ||
      openChapterIndex == null ||
      chapters === null ||
      chapters.length === 0
    )
      return;
    const idx = Math.min(Math.max(0, openChapterIndex), chapters.length - 1);
    const firstId = chapters[idx]?.paragraphs[0]?.id ?? null;
    queueMicrotask(() => {
      setChapterIndex(idx);
      setReadingAnchor(idx, firstId);
    });
    const t = window.setTimeout(() => {
      const el = contentScrollRef.current;
      if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    }, 160);
    router.replace(`/book/${bookId}/read`, { scroll: false });
    return () => window.clearTimeout(t);
  }, [
    openChapterIndex,
    openParagraphId,
    bookId,
    chapters,
    setReadingAnchor,
    router,
  ]);

  useEffect(() => {
    if (!fromCover || coverFadeStarted.current) return;
    coverFadeStarted.current = true;
    void resumeAudioContext().then(() => {
      const h = startMockAmbient({ durationCapMs: 999_999, gain: 0.052 });
      h.fadeOutAndStop(5000);
    });
  }, [fromCover]);

  useEffect(() => {
    if (readingDisplayMode === "immersive") {
      queueMicrotask(() => setImmersivePlaying(true));
    }
  }, [readingDisplayMode]);

  useEffect(() => {
    if (!chapter || chapters === null) return;

    const prog = useReaderStore.getState().progressByBook[bookId];
    const sameChapter =
      prog != null && prog.chapterIndex === chapterIndex;

    const bookmark = sameChapter ? prog.paragraphId : null;

    const targetId =
      bookmark &&
      bookmark !== "" &&
      chapter.paragraphs.some((p) => p.id === bookmark)
        ? bookmark
        : null;

    const t = window.setTimeout(() => {
      const el = contentScrollRef.current;
      if (!el) return;

      const yStore = prog?.scrollOffset ?? 0;

      if (targetId != null) {
        scrollContentToParagraph(el, targetId, "auto");
        return;
      }

      if (yStore > 0) {
        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        el.scrollTop = Math.min(maxScroll, yStore);
      }
    }, 100);

    return () => window.clearTimeout(t);
  }, [bookId, chapterIndex, chapter, chapters]);

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const startPress = (para: Paragraph, cx: number, cy: number) => {
    clearPressTimer();
    pressStart.current = { x: cx, y: cy };
    setPressingId(para.id);
    pressTimer.current = window.setTimeout(() => {
      safeVibrate(10);
      setMenu({ paragraph: para, x: cx, y: cy });
      setPressingId(null);
      pressTimer.current = null;
    }, LONG_PRESS_MS);
  };

  const moveDuringPress = (cx: number, cy: number) => {
    const s = pressStart.current;
    if (!s) return;
    if (Math.hypot(cx - s.x, cy - s.y) > 14) {
      clearPressTimer();
      setPressingId(null);
    }
  };

  const activeParagraphId =
    readerProgressSlice?.paragraphId ??
    chapter?.paragraphs[0]?.id ??
    "";

  const progPctImm = chapter && activeParagraphId
    ? Math.min(
        100,
        Math.max(
          5,
          ((chapter.paragraphs.findIndex((p) => p.id === activeParagraphId) + 1) /
            chapter.paragraphs.length) *
            100,
        ),
      )
    : 0;

  const displayFont =
    readingDisplayMode === "immersive" ? fontSize * 1.22 : fontSize;

  useEffect(() => {
    if (readingDisplayMode !== "immersive" || !immersivePlaying || !chapter) {
      return;
    }
    const idx = chapter.paragraphs.findIndex((p) => p.id === activeParagraphId);
    if (idx < 0) return;
    const para = chapter.paragraphs[idx]!;
    const ms = Math.min(
      14_000,
      1800 / readSpeed + para.text.length * (42 / readSpeed),
    );
    const t = window.setTimeout(() => {
      const next = chapter.paragraphs[idx + 1];
      if (next) {
        scheduleAnchor(next.id);
        const el = contentScrollRef.current;
        if (el) scrollContentToParagraph(el, next.id, "smooth");
      } else if (chapterIndex === totalChapters - 1) {
        toFinished(bookId, { celebrate: true });
      }
    }, ms);
    return () => window.clearTimeout(t);
  }, [
    readingDisplayMode,
    immersivePlaying,
    activeParagraphId,
    chapter,
    bookId,
    chapterIndex,
    readSpeed,
    scheduleAnchor,
    toFinished,
    totalChapters,
  ]);

  const handleVoiceCommitted = async () => {
    const transcript = mockVoiceTranscriptNearParagraph(bookId);
    const answer = mockVoiceAiReply(bookId, transcript);

    setMicProcessing(true);
    await new Promise((r) => setTimeout(r, 980));
    setMicProcessing(false);
    await new Promise((r) => setTimeout(r, 820));

    setBubbleTurn({
      userText: transcript,
      aiText: "",
      streaming: true,
    });

    await mockStreamAiReplyThoughtful(answer, (partial) => {
      setBubbleTurn((prev) =>
        prev
          ? { ...prev, aiText: partial, streaming: true }
          : {
              userText: transcript,
              aiText: partial,
              streaming: true,
            },
      );
    });

    setBubbleTurn((prev) =>
      prev
        ? { ...prev, aiText: answer, streaming: false }
        : { userText: transcript, aiText: answer, streaming: false },
    );
  };

  const chapterHeadline = demoDisplayChapterTitle(
    bookId,
    chapterIndex,
    chapter?.title ?? "",
  );

  if (!book) {
    return (
      <div className="font-sans flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-muted-foreground">未找到书目，请返回重试。</p>
        <button
          type="button"
          onClick={() => back()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          返回
        </button>
      </div>
    );
  }

  if (chapters === null) {
    return (
      <div
        className="font-sans flex min-h-dvh flex-col items-center justify-center gap-8 px-8 text-center"
        style={{ filter: `brightness(${brightness})` }}
      >
        <ReaderSpineLoading />
        <ReaderBouncingLabel chars={["正", "在", "读"]} />
        <p className="font-serif text-xs text-muted-foreground">
          正在加载正文与章节目录…
        </p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="font-sans flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-muted-foreground">
          本书暂无内嵌试读文本，数据库中也尚未入库章节段落。
        </p>
        <button
          type="button"
          onClick={() => back()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          返回
        </button>
      </div>
    );
  }

  const readerBackdrop = isChatOpen || readingSettingsOpen;
  const readerBackdropMotion = readerBackdrop && !reducedMotion;

  const menuFrame =
    menu !== null ? readerMenuPlacement(menu.x, menu.y) : null;

  return (
    <div
      data-lenis-prevent=""
      className={cn(
        "reader-page reader-paper-shell relative flex min-h-dvh flex-1 flex-col",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "reader-deep-vignette motion-safe:transition-opacity motion-reduce:opacity-50 pointer-events-none fixed inset-0 z-[25]",
          readerDeepFocus ? "opacity-[0.94]" : "opacity-0",
        )}
      />

      <ReaderTopChrome
        bookId={bookId}
        chapterIndex={chapterIndex}
        bookTitle={book.title}
        chapterTitle={chapterHeadline}
        progressPct={mergedProgressPct}
        headerVisible={headerVisible}
        pagerBlurBoost={false}
        deepReadingHidden={
          readerDeepFocus || readingDisplayMode === "immersive"
        }
        pendingQuestionsCount={pendingQuestions.length}
        readingDisplayMode={readingDisplayMode}
        onMap={() => toMap(bookId)}
        onSettings={() => setReadingSettingsOpen(true)}
        onReleasePending={() => releasePending()}
      />

      <motion.div
        className="relative flex min-h-dvh flex-col"
        initial={false}
        animate={{
          x: readerBackdropMotion ? "-22%" : "0%",
          scale: readerBackdropMotion ? 0.92 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 34,
        }}
        style={{
          filter: readerBackdropMotion
            ? `brightness(${brightness * 0.91}) blur(4px)`
            : `brightness(${brightness})`,
          pointerEvents: readerBackdrop ? "none" : "auto",
          willChange: readerBackdropMotion ? "transform, filter" : undefined,
        }}
      >
        <ReadingProgressBackgroundSync bookId={bookId} />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          readingDisplayMode === "immersive" &&
            "pt-[calc(2.5rem+env(safe-area-inset-top))]",
          readingDisplayMode === "standard" &&
            "pt-[calc(10rem+env(safe-area-inset-top))]",
        )}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          swipeGestureStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = swipeGestureStart.current;
          swipeGestureStart.current = null;
          if (!s) return;
          const te = e.changedTouches[0];
          if (!te) return;
          const vw = typeof window !== "undefined" ? window.innerWidth : 412;
          const dx = te.clientX - s.x;
          const dyAbs = Math.abs(te.clientY - s.y);
          if (
            readingDisplayMode === "standard" &&
            s.x >= vw - CHAT_EDGE_PX_FROM_RIGHT &&
            dx > 64 &&
            dyAbs < 76
          ) {
            safeVibrate(6);
            openChat();
          }
        }}
      >
        <main
          ref={contentScrollRef}
          className={cn(
            "reader-content flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain",
            "px-[max(1.15rem,_env(safe-area-inset-left))] py-4",
            "pr-[max(1.15rem,_env(safe-area-inset-right))]",
            readingDisplayMode === "standard" &&
              "pb-[calc(12rem+env(safe-area-inset-bottom)+24px)]",
            readingDisplayMode === "immersive" &&
              "pb-[calc(10rem+env(safe-area-inset-bottom))]",
          )}
        >
          <div className="mx-auto w-full min-w-0 max-w-[min(42rem,_100%)]">
            <AnimatePresence mode="wait">
              <ChapterTransition direction={chapterDir} key={chapterIndex}>
                <article
                  className="reader-chapter-pane font-serif text-foreground w-full"
                  style={{
                    fontSize: `${displayFont}px`,
                  }}
                >
                  {(chapter ?? { paragraphs: [] }).paragraphs.map(
                    (para, pi) => {
                      const visuals =
                        paragraphVisualsByBook[bookId]?.[para.id] ?? [];
                      const ornament = pickParagraphOrnament(pi, para.id);
                      const revealKey = `${bookId}-${chapterIndex}-${para.id}`;

                      return (
                        <div
                          key={para.id}
                          className="w-full max-w-[min(100%,_37rem)]"
                        >
                          {ornament ? (
                            <ReaderParagraphDivider symbol={ornament} />
                          ) : null}
                          <ReaderParagraphReveal
                            id={revealKey}
                            seenOnceIdsRef={revealedParasRef}
                          >
                            <ReaderParagraphBlock
                              paragraph={para}
                              isLeadParagraph={pi === 0}
                              pressingId={pressingId}
                              menuParagraphId={menu?.paragraph.id ?? null}
                              onPointerDown={(ev) => {
                                if (ev.button !== 0) return;
                                startPress(para, ev.clientX, ev.clientY);
                              }}
                              onPointerMove={(ev) =>
                                moveDuringPress(ev.clientX, ev.clientY)
                              }
                              onPointerEnd={() => {
                                clearPressTimer();
                                setPressingId(null);
                                pressStart.current = null;
                              }}
                            />
                          </ReaderParagraphReveal>
                          <ParagraphVisualAlbum
                            bookId={bookId}
                            paragraphId={para.id}
                            visuals={visuals}
                            expanded={expandedAlbumFor === para.id}
                            onToggleExpanded={() =>
                              setExpandedAlbumFor((cur) =>
                                cur === para.id ? null : para.id,
                              )
                            }
                          />
                        </div>
                      );
                    },
                  )}
                </article>
              </ChapterTransition>
            </AnimatePresence>

            <AnimatePresence>
              {chapterEndVisible && chapterIndex < totalChapters - 1 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 320,
                    damping: 30,
                  }}
                  className="font-sans mt-10 pb-6"
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.99, opacity: 0.95 }}
                    transition={{ type: "spring", stiffness: 440, damping: 28 }}
                    onClick={() => {
                      safeVibrate(15);
                      router.push(
                        `/book/${bookId}/chapter/${chapterIndex + 1}/cover`,
                      );
                    }}
                    className="w-full rounded-[1.05rem] bg-primary py-[1.15rem] text-center shadow-[var(--shadow-elevation-3)]"
                  >
                    <span className="mx-auto flex max-w-[18rem] flex-col gap-1">
                      <span className="text-[1.0625rem] font-semibold text-primary-foreground">
                        {`第 ${chapterIndex + 1} 章 · 进入下一章`}
                      </span>
                      <span className="text-[0.78rem] font-medium text-primary-foreground/88">
                        本章结束
                      </span>
                    </span>
                  </motion.button>
                </motion.div>
              ) : chapterEndVisible && chapterIndex === totalChapters - 1 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 320,
                    damping: 30,
                  }}
                  className="font-sans mt-10 pb-6"
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.99, opacity: 0.95 }}
                    transition={{ type: "spring", stiffness: 440, damping: 28 }}
                    onClick={() => {
                      safeVibrate(15);
                      toFinished(bookId, { celebrate: true });
                    }}
                    className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevation-3)]"
                  >
                    读完了 · 查看庆祝页
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {menu ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭菜单"
              className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenu(null)}
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.86, rotateX: 16 }}
              animate={{ opacity: 1, scale: 1, rotateX: 5 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: 12 }}
              transition={{
                type: "spring" as const,
                stiffness: 440,
                damping: 32,
              }}
              className="material-glass-dark font-sans fixed z-[53] overflow-hidden rounded-[1.1rem] border border-white/12 p-2 text-foreground shadow-[var(--shadow-elevation-4)]"
              style={{
                left: menuFrame?.left,
                top: menuFrame?.top,
                width: menuFrame?.width,
                transformPerspective: 1100,
              }}
            >
              <div className="perspective-mid space-y-1.5">
                <ReaderMenuTile
                  icon={Palette}
                  label="生成画面"
                  hint="从这段话派生一张氛围图"
                  onPick={() => {
                    /* stub: multimodal.generateForParagraph(...) */
                  }}
                  onDone={() => setMenu(null)}
                />
                <ReaderMenuTile
                  icon={MessagesSquare}
                  label="问 AI"
                  hint="沿当前段落继续追问"
                  onPick={() => openChat()}
                  onDone={() => setMenu(null)}
                />
                <ReaderMenuTile
                  icon={Bookmark}
                  label="书签"
                  hint="稍后再回到这一句"
                  onPick={() => {
                    /* stub: bookmark API */
                  }}
                  onDone={() => setMenu(null)}
                />
                <ReaderMenuTile
                  icon={Mic}
                  label="沉浸朗读"
                  hint="用声音把这段再走一遍"
                  onPick={() => {
                    /* stub: immersive read-aloud */
                  }}
                  onDone={() => setMenu(null)}
                />
              </div>
              <button
                type="button"
                onClick={() => setMenu(null)}
                className="mt-1.5 w-full rounded-xl py-3 text-center text-sm text-muted-foreground hover:bg-white/6"
              >
                取消
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      </motion.div>

      {readingDisplayMode === "standard" && bubbleTurn ? (
        <button
          type="button"
          aria-label="关闭语音气泡"
          className="fixed inset-x-0 bottom-[15rem] top-0 z-[41] bg-black/[0.12] backdrop-blur-[2px]"
          onClick={() => {
            safeVibrate(6);
            setBubbleTurn(null);
          }}
        />
      ) : null}

      {readingDisplayMode === "standard" ? (
        <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-[43] mx-auto flex w-full max-w-[430px] flex-col justify-end gap-8 px-5 pt-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
          <div className="pointer-events-auto mx-auto w-full max-w-lg">
            <ReaderVoiceBubbles
              open={Boolean(bubbleTurn)}
              userText={bubbleTurn?.userText ?? ""}
              aiText={bubbleTurn?.aiText ?? ""}
              aiStreaming={bubbleTurn?.streaming}
              onDismissSwipe={() => setBubbleTurn(null)}
            />
          </div>

          <div className="pointer-events-auto mx-auto w-full max-w-xl">
            <ReaderBgmStrip bookId={bookId} chapterIndex={chapterIndex} />
          </div>

          <div className="pointer-events-auto mx-auto flex w-full justify-center">
            <ReaderFloatingMic
              processing={micProcessing}
              deepFocusGhost={readerDeepFocus}
              hasCompletedBubble={Boolean(
                bubbleTurn &&
                  !bubbleTurn.streaming &&
                  bubbleTurn.aiText.length > 12,
              )}
              onRoundBegin={() => {
                setBubbleTurn(null);
              }}
              onCommitSend={() => void handleVoiceCommitted()}
            />
          </div>
        </footer>
      ) : (
        <footer className="font-sans fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-border/70 bg-background/82 backdrop-blur-lg pb-[max(env(safe-area-inset-bottom),0px)]">
          <ImmersiveReadChrome
            chapterProgressPct={progPctImm}
            immersivePlaying={immersivePlaying}
            onTogglePlaying={() => setImmersivePlaying((v) => !v)}
          />
        </footer>
      )}

      <ChatDrawer
        bookTitle={book.title}
        bookId={bookId}
        paragraphId={activeParagraphId ? activeParagraphId : null}
        chapterIndex={chapterIndex}
      />

      <ReaderReadingSettingsModal
        fontSizeOptions={FONT_SIZE_OPTIONS}
        open={readingSettingsOpen}
        onClose={() => setReadingSettingsOpen(false)}
      />

    </div>
  );
}

function readerMenuPlacement(cx: number, cy: number) {
  const w = typeof window !== "undefined" ? window.innerWidth : 430;
  const h = typeof window !== "undefined" ? window.innerHeight : 820;
  const panelW = Math.min(w - 24, 292);
  const panelH = 310;
  let left = cx - panelW / 2;
  left = Math.max(12, Math.min(left, w - panelW - 12));

  const upper = cy < h * 0.5;
  let top = upper
    ? Math.min(h - panelH - 12, cy + 24)
    : Math.max(112, cy - panelH - 10);

  const mid = cy > h * 0.44 && cy < h * 0.58;
  if (mid) {
    top =
      cy < h * 0.5
        ? Math.min(h - panelH - 12, cy + 48)
        : Math.max(120, cy - panelH - 12);
  }

  return { left, top, width: panelW };
}

function ReaderMenuTile({
  icon: Icon,
  label,
  hint,
  onPick,
  onDone,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  hint: string;
  onPick: () => void;
  onDone: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        safeVibrate(5);
        onPick();
        onDone();
      }}
      className="group relative flex w-full items-start gap-3 overflow-hidden rounded-xl bg-white/4 px-3 py-3 text-left text-foreground transition-colors hover:bg-white/9 active:scale-[0.99] dark:bg-black/18"
    >
      <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/16">
        <Icon className="size-[1.08rem] text-zinc-50" strokeWidth={1.75} />
      </span>
      <span className="relative z-[1] min-w-0 flex-1 space-y-1">
        <span className="block text-sm font-semibold text-zinc-50">
          {label}
        </span>
        <span className="block text-[0.7rem] leading-snug text-zinc-400">
          {hint}
        </span>
      </span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light group-hover:opacity-85"
        initial={false}
        style={{
          background:
            "radial-gradient(120% 140% at var(--mx,50%) var(--my,20%), oklch(1 0 0 / 0.16), transparent 55%)",
        }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - r.left) / r.width) * 100;
          const my = ((e.clientY - r.top) / r.height) * 100;
          e.currentTarget.style.setProperty("--mx", `${mx}%`);
          e.currentTarget.style.setProperty("--my", `${my}%`);
        }}
      />
    </button>
  );
}

