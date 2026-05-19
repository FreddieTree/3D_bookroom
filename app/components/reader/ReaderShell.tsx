"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bot, Map as MapIcon, MessageCircle, Mic, Settings } from "lucide-react";

import { ChatDrawer } from "@/app/components/chat/ChatDrawer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { VoiceRecorderOverlay } from "@/app/components/chat/VoiceRecorderOverlay";
import { ImageGeneration } from "@/app/components/multimodal/ImageGeneration";
import { ParagraphVisualAlbum } from "@/app/components/multimodal/ParagraphVisualAlbum";
import { RadioDramaMode } from "@/app/components/multimodal/RadioDramaMode";
import { ImmersiveReadChrome } from "@/app/components/reader/ImmersiveReadChrome";
import { ReaderBgmStrip } from "@/app/components/reader/ReaderBgmStrip";
import { ReadingProgressBackgroundSync } from "@/app/components/reader/ReadingProgressBackgroundSync";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";
import { getBookById } from "@/app/lib/data/books";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import type { Paragraph } from "@/app/lib/data/sample-content";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { useAppStore } from "@/app/lib/stores/appStore";
import { useReaderStore } from "@/app/lib/stores/readerStore";

const LONG_PRESS_MS = 500;

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
  const { back, toMap, toFinished } = useNavigation();
  const router = useRouter();

  const readerProgressSlice = useReaderStore((s) => s.progressByBook[bookId]);
  const openGlobalSettings = useAppStore((s) => s.openGlobalSettings);

  const setReadingAnchor = useCallback(
    (chapterIdx: number, paragraphId: string | null) => {
      useReaderStore.getState().setReadingPosition(bookId, {
        chapterIndex: chapterIdx,
        paragraphId,
      });
    },
    [bookId],
  );

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

  const [chapterIndex, setChapterIndex] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
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
  const [footerVoiceOpen, setFooterVoiceOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const edgeSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const lastScrollY = useRef(0);
  const lastIoParagraph = useRef<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const footerMicTimer = useRef<number | null>(null);

  const chapter = chapters?.[chapterIndex] ?? null;
  const totalChapters = chapters?.length ?? 0;

  useEffect(() => {
    useReaderStore.getState().setActiveBookId(bookId);
  }, [bookId]);

  useEffect(() => {
    if (!chapters?.length) return;

    const applyChapterFromStore = () => {
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

      if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
      scrollPersistTimer.current = setTimeout(() => {
        useReaderStore.getState().setScrollOffset(bookId, y);
      }, 450);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
      el.removeEventListener("scroll", onScroll);
    };
  }, [bookId, chapter]);

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
          setReadingAnchor(chapterIndex, bestId);
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
  }, [chapterIndex, chapter, setReadingAnchor]);

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
      setReadingAnchor(chIdx, openParagraphId);
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
      setReadingAnchor(idx, firstId);
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
      useReaderStore.getState().progressByBook[bookId]?.paragraphId;
    const targetId =
      bookmark && chapter.paragraphs.some((p) => p.id === bookmark)
        ? bookmark
        : null;

    const t = window.setTimeout(() => {
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ block: "center" });
      } else {
        const y = useReaderStore.getState().progressByBook[bookId]?.scrollOffset;
        if (y != null && y > 0 && scrollRef.current) {
          scrollRef.current.scrollTop = y;
        }
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
    if (Math.hypot(cx - s.x, cy - s.y) > 12) {
      clearPressTimer();
      setPressingId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (footerMicTimer.current) clearTimeout(footerMicTimer.current);
    };
  }, []);

  const clearFooterMicHold = () => {
    if (footerMicTimer.current) {
      clearTimeout(footerMicTimer.current);
      footerMicTimer.current = null;
    }
  };

  const startFooterMicHold = () => {
    clearFooterMicHold();
    footerMicTimer.current = window.setTimeout(() => {
      footerMicTimer.current = null;
      safeVibrate(12);
      setFooterVoiceOpen(true);
    }, 450);
  };

  const activeParagraphId =
    readerProgressSlice?.paragraphId ??
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
        setReadingAnchor(chapterIndex, next.id);
        lastIoParagraph.current = next.id;
        document.getElementById(next.id)?.scrollIntoView({ block: "center" });
      } else if (chapterIndex === totalChapters - 1) {
        toFinished(bookId);
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
    toFinished,
    totalChapters,
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
      <ReadingProgressBackgroundSync bookId={bookId} />
      <motion.div
        className="font-sans absolute left-0 right-0 top-0 z-40 overflow-hidden pointer-events-none"
        initial={false}
        animate={{
          y:
            readingDisplayMode === "immersive"
              ? -96
              : headerVisible
                ? 0
                : -96,
        }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "transform", pointerEvents: "none" }}
      >
        <div className="pointer-events-auto">
          <PageHeader
            sticky={false}
            elevated={headerVisible}
            subtitle={book.title}
            title={chapter?.title ?? ""}
            right={
              <div className="flex shrink-0 items-center">
                <div className="relative">
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
                <button
                  type="button"
                  onClick={() => toMap(bookId)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-accent hover:bg-muted"
                  aria-label="阅读地图"
                >
                  <MapIcon className="size-[1.2rem]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => openGlobalSettings()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="设置"
                >
                  <Settings className="size-[1.15rem]" strokeWidth={1.75} />
                </button>
              </div>
            }
          />
        </div>
      </motion.div>

      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain pb-[5.5rem] pt-[3.25rem]",
          readingDisplayMode === "immersive" && "pb-32 pt-5",
        )}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          edgeSwipeStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = edgeSwipeStart.current;
          edgeSwipeStart.current = null;
          if (!s) return;
          const te = e.changedTouches[0];
          if (!te || typeof window === "undefined") return;
          const w = window.innerWidth;
          const fromRightEdge = s.x > w - 36;
          const dx = s.x - te.clientX;
          const dy = Math.abs(te.clientY - s.y);
          if (readingDisplayMode === "standard" && fromRightEdge && dx > 70 && dy < 90) {
            openChat();
          }
        }}
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
            return (
              <div key={para.id}>
                <p
                  id={para.id}
                  data-paragraph-id={para.id}
                  className={cn(
                    pressingId === para.id && "reader-paragraph-highlight",
                  )}
                  style={{ marginBottom: "0.35em" }}
                >
                  <span
                    className="cursor-default select-text"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
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
          ) : chapterEndVisible && chapterIndex === totalChapters - 1 ? (
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
                  toFinished(bookId);
                }}
                className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-[0.99]"
              >
                读完了 · 查看庆祝页
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
                onPointerDown={() => startFooterMicHold()}
                onPointerUp={clearFooterMicHold}
                onPointerCancel={clearFooterMicHold}
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-95"
                aria-label="长按语音问 AI"
              >
                <Mic className="size-5" strokeWidth={1.85} />
              </button>
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
                label="📌 标记"
                onPick={() =>
                  console.log("[reader] bookmark (placeholder)", menu.paragraph.id)
                }
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

      <VoiceRecorderOverlay
        open={footerVoiceOpen}
        onClose={() => setFooterVoiceOpen(false)}
        onSend={(text) =>
          sendChatMessage(text, {
            bookId,
            paragraphId: activeParagraphId ? activeParagraphId : null,
            currentChapterIndex: chapterIndex,
          })
        }
      />

      <ImageGeneration
        bookId={bookId}
        open={imageGenParagraph != null}
        onClose={() => setImageGenParagraph(null)}
        paragraph={imageGenParagraph}
      />

      <RadioDramaMode
        open={radioParagraph != null}
        onClose={() => setRadioParagraph(null)}
        paragraph={radioParagraph}
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
