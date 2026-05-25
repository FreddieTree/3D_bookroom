"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bot, ChevronLeft, Map as MapIcon, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";

import { ChatDrawer } from "@/app/components/chat/ChatDrawer";
import { ImageGeneration } from "@/app/components/multimodal/ImageGeneration";
import { ParagraphVisualAlbum } from "@/app/components/multimodal/ParagraphVisualAlbum";
import { RadioDramaMode } from "@/app/components/multimodal/RadioDramaMode";
import { ReaderBgmStrip } from "@/app/components/reader/ReaderBgmStrip";
import { ImmersiveReadChrome } from "@/app/components/reader/ImmersiveReadChrome";
import { ReaderSettingsDrawer } from "@/app/components/reader/ReaderSettingsDrawer";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";
import { getBookById } from "@/app/lib/data/books";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import type { Paragraph } from "@/app/lib/data/sample-content";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { useAppStore } from "@/app/lib/stores/appStore";

const LONG_PRESS_MS = 500;
const FONT_SIZES = [14, 16, 18, 20, 22] as const;

type ReaderShellProps = {
  bookId: string;
  /** 从阅读地图带锚点进入时由 URL `?p=` 传入 */
  openParagraphId?: string | null;
  /** 由章节封面进入时 `?chapter=`（0-based） */
  openChapterIndex?: number | null;
  /** 由章节封面「开始阅读」进入，用于 BGM 渐隐 */
  fromCover?: boolean;
};

export function ReaderShell({
  bookId,
  openParagraphId = null,
  openChapterIndex = null,
  fromCover = false,
}: ReaderShellProps) {
  const book = getBookById(bookId);
  const chapters = getChaptersForBook(bookId);
  const { back } = useNavigation();
  const router = useRouter();

  const readerProgressByBook = useAppStore((s) => s.readerProgressByBook);
  const setReadingAnchor = useAppStore((s) => s.setReadingAnchor);
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId);
  const openChat = useAppStore((s) => s.openChat);
  const releasePending = useAppStore((s) => s.releasePending);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const fontSize = useAppStore((s) => s.readerSettings.fontSize);
  const brightness = useAppStore((s) => s.readerSettings.brightness);
  const readingDisplayMode = useAppStore(
    (s) => s.readerSettings.readingDisplayMode,
  );
  const readSpeed = useAppStore((s) => s.readerSettings.readSpeed);
  const paragraphVisualsByBook = useAppStore(
    (s) => s.paragraphVisualsByBook,
  );
  const bookmarksByBook = useAppStore((s) => s.bookmarksByBook);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  const [chapterIndex, setChapterIndex] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapterEndVisible, setChapterEndVisible] = useState(false);
  const [immersivePlaying, setImmersivePlaying] = useState(true);
  const [imageGenParagraph, setImageGenParagraph] = useState<Paragraph | null>(
    null,
  );
  const [radioParagraph, setRadioParagraph] = useState<Paragraph | null>(
    null,
  );
  const [expandedAlbumFor, setExpandedAlbumFor] = useState<string | null>(null);

  const coverFadeStarted = useRef(false);

  const [menu, setMenu] = useState<{
    paragraph: Paragraph;
    x: number;
    y: number;
  } | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const lastIoParagraph = useRef<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const chapter = chapters?.[chapterIndex] ?? null;
  const totalChapters = chapters?.length ?? 0;

  useEffect(() => {
    setCurrentBookId(bookId);
  }, [bookId, setCurrentBookId]);

  useEffect(() => {
    if (!chapters?.length) return;

    const applyChapterFromStore = () => {
      const raw =
        useAppStore.getState().readerProgressByBook[bookId]?.chapterIndex ?? 0;
      setChapterIndex(
        Math.min(Math.max(0, raw), chapters.length - 1),
      );
    };

    if (useAppStore.persist.hasHydrated()) {
      queueMicrotask(applyChapterFromStore);
    }

    return useAppStore.persist.onFinishHydration(() => {
      applyChapterFromStore();
    });
  }, [bookId, chapters]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !chapter) return;

    const onScroll = () => {
      const y = el.scrollTop;
      const dy = y - lastScrollY.current;
      if (y < 32) setHeaderVisible(true);
      else if (dy > 4) setHeaderVisible(false);
      else if (dy < -4) setHeaderVisible(true);
      lastScrollY.current = y;

      const nearEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setChapterEndVisible(nearEnd);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [chapter]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !chapter) return;

    const ratios = new Map<string, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.paragraphId;
          if (!id) continue;
          if (e.isIntersecting) ratios.set(id, e.intersectionRatio);
          else ratios.delete(id);
        }
        let bestId: string | null = null;
        let bestR = 0;
        ratios.forEach((r, id) => {
          if (!bestId || r > bestR) {
            bestId = id;
            bestR = r;
          }
        });
        if (bestId && bestId !== lastIoParagraph.current) {
          lastIoParagraph.current = bestId;
          setReadingAnchor(bookId, chapterIndex, bestId);
        }
      },
      {
        root,
        rootMargin: "-18% 0px -32% 0px",
        threshold: [0.06, 0.15, 0.35, 0.55, 0.75, 0.9],
      },
    );

    const nodes = root.querySelectorAll<HTMLElement>("p[data-paragraph-id]");
    nodes.forEach((n) => io.observe(n));
    return () => {
      io.disconnect();
      ratios.clear();
    };
  }, [bookId, chapterIndex, chapter, setReadingAnchor]);

  useEffect(() => {
    lastIoParagraph.current = null;
  }, [chapterIndex]);

  useEffect(() => {
    if (!openParagraphId || !chapters?.length) return;
    const chIdx = chapters.findIndex((ch) =>
      ch.paragraphs.some((p) => p.id === openParagraphId),
    );
    if (chIdx < 0) return;
    queueMicrotask(() => {
      setChapterIndex(chIdx);
      setReadingAnchor(bookId, chIdx, openParagraphId);
      lastIoParagraph.current = openParagraphId;
    });
    const t = window.setTimeout(() => {
      document
        .getElementById(openParagraphId)
        ?.scrollIntoView({ block: "center" });
    }, 160);
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
      !chapters?.length
    )
      return;
    const idx = Math.min(Math.max(0, openChapterIndex), chapters.length - 1);
    const firstId = chapters[idx]?.paragraphs[0]?.id ?? null;
    queueMicrotask(() => {
      setChapterIndex(idx);
      setReadingAnchor(bookId, idx, firstId);
      lastIoParagraph.current = firstId;
    });
    const t = window.setTimeout(() => {
      if (firstId) {
        document
          .getElementById(firstId)
          ?.scrollIntoView({ block: "center" });
      }
    }, 140);
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
    if (!chapter) return;
    const bookmark =
      useAppStore.getState().readerProgressByBook[bookId]?.paragraphId;
    const targetId =
      bookmark && chapter.paragraphs.some((p) => p.id === bookmark)
        ? bookmark
        : null;

    const t = window.setTimeout(() => {
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ block: "center" });
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [bookId, chapterIndex, chapter]);

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
    pressTimer.current = setTimeout(() => {
      safeVibrate(10);
      setMenu({ paragraph: para, x: cx, y: cy });
      setPressingId(null);
      pressTimer.current = null;
    }, LONG_PRESS_MS);
  };

  const moveDuringPress = (cx: number, cy: number) => {
    const s = pressStart.current;
    if (!s) return;
    if (Math.hypot(cx - s.x, cy - s.y) > 20) {
      clearPressTimer();
      setPressingId(null);
    }
  };


  const activeParagraphId =
    readerProgressByBook[bookId]?.paragraphId ??
    chapter?.paragraphs[0]?.id ??
    "";

  const progPct = chapter
    ? Math.min(
        100,
        Math.max(
          5,
          ((chapter.paragraphs.findIndex((p) => p.id === activeParagraphId) +
            1) /
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
        setReadingAnchor(bookId, chapterIndex, next.id);
        lastIoParagraph.current = next.id;
        document.getElementById(next.id)?.scrollIntoView({ block: "center" });
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
    setReadingAnchor,
  ]);

  if (!book || !chapters?.length) {
    return (
      <div className="font-sans flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-muted-foreground">
          本书暂无内嵌试读文本，或尚未在书目中配置。
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

  return (
    <div
      className="relative flex min-h-dvh flex-col bg-background"
      style={{
        filter: `brightness(${brightness})`,
        willChange: "filter",
      }}
    >
      <motion.header
        className="font-sans absolute left-0 right-0 top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md"
        initial={false}
        animate={{
          y:
            readingDisplayMode === "immersive"
              ? -80
              : headerVisible
                ? 0
                : -80,
        }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "transform" }}
      >
        <div className="flex h-[3.25rem] items-center gap-1 px-1 pl-0">
          <button
            type="button"
            onClick={() => back()}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-muted"
            aria-label="返回"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="truncate text-[0.7rem] font-semibold text-muted-foreground">
              {book.title}
            </p>
            <p className="truncate text-xs font-medium text-foreground">
              {chapter?.title}
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => openChat()}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-primary hover:bg-muted"
              aria-label="AI 阅读伙伴"
            >
              <Bot className="size-[1.2rem]" strokeWidth={1.75} />
            </button>
            {pendingQuestions.length > 0 ? (
              <button
                type="button"
                className="absolute right-0 top-0.5 z-10 flex min-h-[1.25rem] min-w-[1.25rem] items-start justify-end rounded-sm p-0"
                aria-label="揭晓悬念"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  releasePending();
                }}
              >
                <span className="reader-pending-breathe block h-2.5 w-2.5 rounded-full bg-destructive shadow-sm ring-2 ring-background" />
              </button>
            ) : null}
          </div>
          <Link
            href={`/book/${bookId}/map`}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-accent hover:bg-muted"
            aria-label="阅读地图"
          >
            <MapIcon className="size-[1.2rem]" strokeWidth={1.75} />
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="阅读设置"
          >
            <Settings className="size-[1.15rem]" strokeWidth={1.75} />
          </button>
        </div>
      </motion.header>

      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[5.5rem] pt-[3.25rem]",
          readingDisplayMode === "immersive" && "pb-32 pt-5",
        )}
      >
        <article
          className="font-serif text-foreground"
          style={{
            fontSize: `${displayFont}px`,
            lineHeight: 1.85,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 8,
            paddingBottom: 32,
          }}
        >
          {chapter?.paragraphs.map((para) => {
            const visuals =
              paragraphVisualsByBook[bookId]?.[para.id] ?? [];
            const isBookmarked =
              bookmarksByBook[bookId]?.includes(para.id) ?? false;
            return (
              <div key={para.id}>
                <p
                  id={para.id}
                  data-paragraph-id={para.id}
                  className={cn(
                    pressingId === para.id && "reader-paragraph-highlight",
                    isBookmarked &&
                      "relative border-l-2 border-primary pl-3 -ml-3",
                  )}
                  style={{ marginBottom: "0.35em" }}
                >
                  <span
                    className="cursor-default select-none"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      clearPressTimer();
                      setPressingId(null);
                      safeVibrate(10);
                      setMenu({ paragraph: para, x: e.clientX, y: e.clientY });
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0 && e.button !== -1) return;
                      startPress(para, e.clientX, e.clientY);
                    }}
                    onPointerMove={(e) => moveDuringPress(e.clientX, e.clientY)}
                    onPointerUp={() => {
                      clearPressTimer();
                      setPressingId(null);
                      pressStart.current = null;
                    }}
                    onPointerCancel={() => {
                      clearPressTimer();
                      setPressingId(null);
                      pressStart.current = null;
                    }}
                  >
                    {para.text}
                  </span>
                </p>
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
          })}
        </article>

        <AnimatePresence>
          {chapterEndVisible && chapterIndex < totalChapters - 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ type: "spring" as const, stiffness: 320, damping: 30 }}
              className="font-sans px-6 pb-16 pt-4"
            >
              <button
                type="button"
                onClick={() => {
                  safeVibrate(15);
                  router.push(
                    `/book/${bookId}/chapter/${chapterIndex + 1}/cover`,
                  );
                }}
                className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-[0.99]"
              >
                本章结束 · 进入下一章
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <footer className="font-sans sticky bottom-0 z-30 border-t border-border/70 bg-background/75 backdrop-blur-lg">
        {readingDisplayMode === "standard" ? (
          <ReaderBgmStrip bookId={bookId} chapterIndex={chapterIndex} />
        ) : null}
        {readingDisplayMode === "immersive" ? (
          <ImmersiveReadChrome
            chapterProgressPct={progPct}
            immersivePlaying={immersivePlaying}
            onTogglePlaying={() => setImmersivePlaying((v) => !v)}
          />
        ) : (
          <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${progPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[0.65rem] font-medium tabular-nums text-muted-foreground">
                  第 {chapterIndex + 1} 章 · {Math.round(progPct)}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => openChat()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="AI 对话"
              >
                <MessageCircle className="size-[1.25rem]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </footer>

      <AnimatePresence>
        {menu ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭菜单"
              className="fixed inset-0 z-50 bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenu(null)}
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring" as const, stiffness: 420, damping: 28 }}
              className="font-sans fixed z-[60] w-[min(calc(100vw-2rem),17.5rem)] rounded-2xl border border-border bg-background p-2 shadow-[var(--shadow-soft)]"
              style={{
                left: Math.min(
                  menu.x - 110,
                  (typeof window !== "undefined" ? window.innerWidth : 430) - 24,
                ),
                top: Math.max(96, menu.y - 220),
                willChange: "transform, opacity",
              }}
            >
              <MenuRow
                label="🎨 生成画面"
                onPick={() => setImageGenParagraph(menu.paragraph)}
                onDone={() => setMenu(null)}
              />
              <MenuAskAiLongPress
                onLongPress={() => openChat()}
                onDone={() => setMenu(null)}
              />
              <MenuRow
                label={
                  bookmarksByBook[bookId]?.includes(menu.paragraph.id)
                    ? "📌 取消标记"
                    : "📌 标记"
                }
                onPick={() => toggleBookmark(bookId, menu.paragraph.id)}
                onDone={() => setMenu(null)}
              />
              <MenuRow
                label="🎭 广播剧朗读"
                onPick={() => setRadioParagraph(menu.paragraph)}
                onDone={() => setMenu(null)}
              />
              <button
                type="button"
                onClick={() => setMenu(null)}
                className="mt-1 w-full rounded-xl py-3 text-center text-sm text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <ChatDrawer
        bookTitle={book.title}
        bookId={bookId}
        paragraphId={activeParagraphId ? activeParagraphId : null}
        chapterIndex={chapterIndex}
      />


      <ImageGeneration
        bookId={bookId}
        open={imageGenParagraph != null}
        onClose={() => setImageGenParagraph(null)}
        paragraph={imageGenParagraph}
      />

      <RadioDramaMode
        bookId={bookId}
        open={radioParagraph != null}
        onClose={() => setRadioParagraph(null)}
        paragraph={radioParagraph}
      />

      <ReaderSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSizeOptions={FONT_SIZES}
      />
    </div>
  );
}

function MenuRow({
  label,
  onPick,
  onDone,
}: {
  label: string;
  onPick: () => void;
  onDone: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
      onClick={() => {
        onPick();
        onDone();
      }}
    >
      {label}
    </button>
  );
}

function MenuAskAiLongPress({
  onLongPress,
  onDone,
}: {
  onLongPress: () => void;
  onDone: () => void;
}) {
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <button
      type="button"
      className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
      onPointerDown={() => {
        clear();
        timer.current = window.setTimeout(() => {
          timer.current = null;
          safeVibrate(10);
          onLongPress();
          onDone();
        }, 450);
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
    >
      🤖 问 AI
    </button>
  );
}
