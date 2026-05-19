"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { ChatDrawer } from "@/app/components/chat/ChatDrawer";
import { ParagraphVisualAlbum } from "@/app/components/multimodal/ParagraphVisualAlbum";
import { ImmersiveReadChrome } from "@/app/components/reader/ImmersiveReadChrome";
import { ReaderBgmStrip } from "@/app/components/reader/ReaderBgmStrip";
import { ReaderFloatingMic } from "@/app/components/reader/ReaderFloatingMic";
import { ReaderParagraphBlock } from "@/app/components/reader/ReaderParagraphBlock";
import { ReaderReadingSettingsModal } from "@/app/components/reader/ReaderReadingSettingsModal";
import { ReaderTopChrome } from "@/app/components/reader/ReaderTopChrome";
import { ReaderVoiceBubbles } from "@/app/components/reader/ReaderVoiceBubbles";
import { ReadingProgressBackgroundSync } from "@/app/components/reader/ReadingProgressBackgroundSync";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import { getBookById } from "@/app/lib/data/books";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import type { Paragraph } from "@/app/lib/data/sample-content";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import {
  demoDisplayChapterTitle,
  mockStreamAiReplyChars,
  mockVoiceAiReply,
  mockVoiceTranscriptNearParagraph,
} from "@/app/lib/mock/reading";
import { throttle } from "@/app/lib/utils/throttle";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";
import { useAppStore } from "@/app/lib/stores/appStore";
import { useReaderStore } from "@/app/lib/stores/readerStore";

const LONG_PRESS_MS = 500;
const SCROLL_NAV_HIDE_AFTER = 100;
const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22] as const;

type ReaderShellProps = {
  bookId: string;
  openParagraphId?: string | null;
  openChapterIndex?: number | null;
  fromCover?: boolean;
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
}: ReaderShellProps) {
  const book = getBookById(bookId);
  const chapters = getChaptersForBook(bookId);
  const { back, toMap, toFinished } = useNavigation();
  const router = useRouter();

  const readerProgressSlice = useReaderStore((s) => s.progressByBook[bookId]);

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
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const paragraphVisualsByBook = useAppStore((s) => s.paragraphVisualsByBook);

  const fontSize = useAppStore((s) => s.readerSettings.fontSize);
  const brightness = useAppStore((s) => s.readerSettings.brightness);
  const readingDisplayMode = useAppStore(
    (s) => s.readerSettings.readingDisplayMode,
  );
  const readSpeed = useAppStore((s) => s.readerSettings.readSpeed);

  const [chapterIndex, setChapterIndex] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [chapterEndVisible, setChapterEndVisible] = useState(false);
  const [immersivePlaying, setImmersivePlaying] = useState(true);
  const [expandedAlbumFor, setExpandedAlbumFor] = useState<string | null>(null);

  const [readingSettingsOpen, setReadingSettingsOpen] = useState(false);
  const [micProcessing, setMicProcessing] = useState(false);
  const [bubbleTurn, setBubbleTurn] = useState<BubbleTurn | null>(null);
  const [scrollProgressPct, setScrollProgressPct] = useState(0);

  const coverFadeStarted = useRef(false);

  const [menu, setMenu] = useState<{
    paragraph: Paragraph;
    x: number;
    y: number;
  } | null>(null);

  const [pressingId, setPressingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const swipeGestureStart = useRef<{ x: number; y: number } | null>(null);

  const lastScrollY = useRef(0);
  const anchorDebounce = useRef<number | null>(null);
  const ratiosRef = useRef(new Map<string, number>());

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const chapter = chapters?.[chapterIndex] ?? null;
  const totalChapters = chapters?.length ?? 0;

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
    const el = scrollRef.current;
    if (!el || !chapter) return;

    const runScroll = () => {
      const y = el.scrollTop;
      const dy = y - lastScrollY.current;
      if (y < 32 || y < SCROLL_NAV_HIDE_AFTER) setHeaderVisible(true);
      else if (y >= SCROLL_NAV_HIDE_AFTER && dy > 1) setHeaderVisible(false);
      else if (dy < -2) setHeaderVisible(true);

      lastScrollY.current = y;

      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      const scrollPct = Math.min(100, (y / maxScroll) * 100);
      const nearChapterEndPx = maxScroll - y < 10;
      if (nearChapterEndPx) setScrollProgressPct(100);
      else setScrollProgressPct(scrollPct);

      const nearEnd =
        maxScroll <= 48 || nearChapterEndPx || el.scrollHeight - y - el.clientHeight < 120;
      setChapterEndVisible(Boolean(nearEnd));

      if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
      scrollPersistTimer.current = setTimeout(() => {
        useReaderStore.getState().setScrollOffset(bookId, y);
      }, 450);
    };

    const throttled = throttle(runScroll, 100);

    el.addEventListener("scroll", throttled, { passive: true });
    runScroll();
    return () => {
      if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
      el.removeEventListener("scroll", throttled as EventListener);
    };
  }, [bookId, chapter]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !chapter) return;

    const ratios = ratiosRef.current;
    ratios.clear();

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
        if (bestId) scheduleAnchor(bestId);
      },
      {
        root,
        rootMargin: "-20% 0px -32% 0px",
        threshold: [0.06, 0.18, 0.35, 0.52, 0.72, 0.92],
      },
    );

    const nodes = root.querySelectorAll<HTMLElement>("p[data-paragraph-id]");
    nodes.forEach((n) => io.observe(n));

    return () => {
      io.disconnect();
      ratios.clear();
    };
  }, [chapterIndex, chapter, scheduleAnchor]);

  useEffect(() => {
    ratiosRef.current.clear();
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
      ratiosRef.current.clear();
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
      ratiosRef.current.clear();
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
    scheduleAnchor,
    toFinished,
    totalChapters,
  ]);

  const handleVoiceCommitted = async () => {
    const transcript = mockVoiceTranscriptNearParagraph(bookId);
    const answer = mockVoiceAiReply(bookId, transcript);

    setMicProcessing(true);

    await new Promise((r) => setTimeout(r, 420));

    setMicProcessing(false);
    setBubbleTurn({
      userText: transcript,
      aiText: "",
      streaming: true,
    });

    await mockStreamAiReplyChars(answer, (partial) => {
      setBubbleTurn((prev) =>
        prev
          ? { ...prev, aiText: partial, streaming: true }
          : { userText: transcript, aiText: partial, streaming: true },
      );
    }, 25);

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
      className={cn(
        "reader-paper-shell relative flex min-h-dvh flex-col",
      )}
      style={{
        filter: `brightness(${brightness})`,
        willChange: "filter",
      }}
    >
      <ReadingProgressBackgroundSync bookId={bookId} />

      <ReaderTopChrome
        bookTitle={book.title}
        chapterTitle={chapterHeadline}
        progressPct={mergedProgressPct}
        headerVisible={headerVisible}
        pendingQuestionsCount={pendingQuestions.length}
        readingDisplayMode={readingDisplayMode}
        onMap={() => toMap(bookId)}
        onSettings={() => setReadingSettingsOpen(true)}
        onReleasePending={() => releasePending()}
      />

      {/* scroll + overlays below */}
      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain pb-[calc(15rem+env(safe-area-inset-bottom))]",
          readingDisplayMode === "immersive" && "pb-[min(42dvh,_18rem)] pt-10",
          readingDisplayMode === "standard" && "pt-[10rem]",
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
          const dx = te.clientX - s.x;
          const dy = Math.abs(te.clientY - s.y);
          if (
            readingDisplayMode === "standard" &&
            dx > 82 &&
            dy < 74
          ) {
            safeVibrate(6);
            openChat();
          }
        }}
      >
        <div className={cn("perspective-mid preserve-3d mx-auto w-full max-w-[min(42rem,_100%)] pb-28")}>
          <AnimatePresence mode="wait">
            <motion.article
              key={chapterIndex}
              className={cn(
                "font-serif text-foreground preserve-3d px-6",
              )}
              initial={{ opacity: 0.08, rotateY: -32, x: -10 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={{ opacity: 0.1, rotateY: 28, x: 12 }}
              transition={{ type: "spring", stiffness: 280, damping: 34 }}
              style={{
                fontSize: `${displayFont}px`,
                lineHeight: 1.8,
                transformOrigin: "center center",
              }}
            >
              {chapter?.paragraphs.map((para) => {
                const visuals =
                  paragraphVisualsByBook[bookId]?.[para.id] ?? [];
                return (
                  <div key={para.id}>
                    <ReaderParagraphBlock
                      paragraph={para}
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
            </motion.article>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {chapterEndVisible && chapterIndex < totalChapters - 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ type: "spring" as const, stiffness: 320, damping: 30 }}
              className="font-sans px-6 pb-[max(2rem,_env(safe-area-inset-bottom))] pt-4"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.982 }}
                onClick={() => {
                  safeVibrate(15);
                  router.push(
                    `/book/${bookId}/chapter/${chapterIndex + 1}/cover`,
                  );
                }}
                className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevation-3)]"
              >
                本章结束 · 进入下一章
              </motion.button>
            </motion.div>
          ) : chapterEndVisible && chapterIndex === totalChapters - 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ type: "spring" as const, stiffness: 320, damping: 30 }}
              className="font-sans px-6 pb-[max(2rem,_env(safe-area-inset-bottom))] pt-4"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.982 }}
                onClick={() => {
                  safeVibrate(15);
                  toFinished(bookId);
                }}
                className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevation-3)]"
              >
                读完了 · 查看庆祝页
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

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
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[43] flex flex-col justify-end gap-10 px-5 pb-[max(2rem,calc(env(safe-area-inset-bottom)+2rem))] pt-6">
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
              onRoundBegin={() => {
                setBubbleTurn(null);
              }}
              onCommitSend={() => void handleVoiceCommitted()}
            />
          </div>
        </div>
      ) : (
        <footer className="font-sans sticky bottom-0 z-30 border-t border-border/70 bg-background/82 backdrop-blur-lg">
          <ImmersiveReadChrome
            chapterProgressPct={progPctImm}
            immersivePlaying={immersivePlaying}
            onTogglePlaying={() => setImmersivePlaying((v) => !v)}
          />
        </footer>
      )}

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
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.82 }}
              transition={{
                type: "spring" as const,
                stiffness: 480,
                damping: 29,
              }}
              className="font-sans fixed z-[53] w-[min(calc(100vw-2rem),17.85rem)] rounded-2xl border border-border bg-background p-2 shadow-[var(--shadow-elevation-3)]"
              style={{
                left:
                  typeof window !== "undefined"
                    ? Math.min(
                        Math.max(16, menu.x - 120),
                        Math.max(16, window.innerWidth - 280),
                      )
                    : 16,
                top:
                  typeof window !== "undefined"
                    ? Math.min(
                        Math.max(
                          88,
                          menu.y -
                            (menu.y > Math.min(window.innerHeight * 0.55, 360)
                              ? 232
                              : -12),
                        ),
                        window.innerHeight - 260,
                      )
                    : 120,
              }}
            >
              <MenuRow
                label="🎨 生成画面"
                onPick={() =>
                  console.log("[reader] generate-visual (stub)", menu.paragraph.id)
                }
                onDone={() => setMenu(null)}
              />
              <MenuRow
                label="🤖 问 AI"
                onPick={() => openChat()}
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
                onPick={() =>
                  console.log("[reader] drama (stub)", menu.paragraph.id)
                }
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

      <ReaderReadingSettingsModal
        fontSizeOptions={FONT_SIZE_OPTIONS}
        open={readingSettingsOpen}
        onClose={() => setReadingSettingsOpen(false)}
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
      className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted active:bg-muted/80"
      onClick={() => {
        safeVibrate(5);
        onPick();
        onDone();
      }}
    >
      {label}
    </button>
  );
}

