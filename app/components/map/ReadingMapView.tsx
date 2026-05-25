"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Music,
  Share2,
  UserRound,
} from "lucide-react";

import { useBookMeta } from "@/app/lib/hooks/useBookMeta";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import {
  getLittlePrinceMapStats,
  getMapNodesForBook,
  MAP_DEMO_NOW,
  mapTabMatchesNode,
  type MapFilterTab,
  type MapNode,
} from "@/app/lib/mock/map-data";
import {
  buildResolvedMapNodes,
  resolveMapJumpTarget,
} from "@/app/lib/map/resolve-map-nodes";
import { fetchMergedBookChapters } from "@/app/lib/reader/fetch-merged-book-chapters";
import type { ChapterContent } from "@/app/lib/data/sample-content";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import { useAppStore } from "@/app/lib/stores/appStore";
import { useReaderStore } from "@/app/lib/stores/readerStore";
import { cn } from "@/app/lib/utils";
import { ReadingMapTimeTower } from "@/app/components/map/ReadingMapTimeTower";
import { computeReadProgressPercentFlexible } from "@/app/lib/utils/read-progress-percent";
import { formatRelativeTimePast } from "@/app/lib/utils/relative-time";
import { safeVibrate } from "@/app/lib/utils/vibrate";

const FILTER_TABS: { id: MapFilterTab; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "dialogue", label: "我的对话" },
  { id: "image", label: "画面" },
  { id: "character", label: "人物" },
  { id: "bookmark", label: "书签" },
  { id: "pending", label: "悬念" },
];

const LONG_MS = 450;

function nodeIcon(type: MapNode["type"]) {
  switch (type) {
    case "current":
      return (
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
          <span className="relative text-[0.65rem] font-bold">读</span>
        </span>
      );
    case "chapter":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-500/20 text-zinc-200 ring-1 ring-white/12">
          <BookOpen className="size-[1.05rem]" strokeWidth={1.75} />
        </span>
      );
    case "image":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
          <ImageIcon className="size-5" strokeWidth={1.75} />
        </span>
      );
    case "dialogue":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
          <MessageCircle className="size-5" strokeWidth={1.75} />
        </span>
      );
    case "character":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
          <UserRound className="size-5" strokeWidth={1.75} />
        </span>
      );
    case "pending":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/35">
          <Lock className="size-[1.15rem]" strokeWidth={1.85} />
        </span>
      );
    case "bookmark":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200">
          <Bookmark className="size-5" strokeWidth={1.75} />
        </span>
      );
    case "bgm":
      return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200">
          <Music className="size-5" strokeWidth={1.75} />
        </span>
      );
    default:
      return null;
  }
}

type ReadingMapViewProps = {
  bookId: string;
};

export function ReadingMapView({ bookId }: ReadingMapViewProps) {
  const { back, toRead } = useNavigation();
  const book = useBookMeta(bookId);

  const [tocFromApi, setTocFromApi] = useState<ChapterContent[] | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    void fetchMergedBookChapters(bookId).then((rows) => {
      if (!alive) return;
      setTocFromApi(rows);
    });
    return () => {
      alive = false;
    };
  }, [bookId]);

  const chaptersLoading = tocFromApi === null;

  const chapters = useMemo(() => {
    if (chaptersLoading) return [];
    if (tocFromApi.length > 0) return tocFromApi;
    return getChaptersForBook(bookId) ?? [];
  }, [tocFromApi, bookId, chaptersLoading]);

  const jumpToParagraph = useCallback(
    (paragraphId: string, chapterIndex: number) => {
      if (chapters.length === 0) {
        toRead(bookId);
        return;
      }
      const { chapterIndex: safeIdx, paragraphId: pid } =
        resolveMapJumpTarget(chapters, paragraphId, chapterIndex);
      useReaderStore.getState().setReadingPosition(bookId, {
        chapterIndex: safeIdx,
        paragraphId: pid,
      });
      toRead(bookId, { chapter: safeIdx, p: pid || undefined });
    },
    [bookId, chapters, toRead],
  );

  const readerProgressByBook = useReaderStore((s) => s.progressByBook);
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const bookmarksByBook = useAppStore((s) => s.bookmarksByBook);
  const bookmarks = useMemo(
    () => bookmarksByBook[bookId] ?? [],
    [bookmarksByBook, bookId],
  );
  const mapSessionByBook = useAppStore((s) => s.mapSessionByBook);
  const setMapSession = useAppStore((s) => s.setMapSession);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<MapNode | null>(null);
  const [shareHint, setShareHint] = useState(false);
  const longTimer = useRef<number | null>(null);
  const longTriggered = useRef(false);

  const progress = readerProgressByBook[bookId];
  const readPct = useMemo(
    () => computeReadProgressPercentFlexible(bookId, progress),
    [bookId, progress],
  );
  const currentCh = useMemo(() => {
    const raw = progress?.chapterIndex ?? 0;
    if (chapters.length === 0) return 0;
    return Math.min(Math.max(0, raw), chapters.length - 1);
  }, [progress?.chapterIndex, chapters.length]);

  const rawMockNodes = useMemo(
    () =>
      getMapNodesForBook(bookId, {
        chatMessages,
        pendingQuestions,
        runtimeBookmarks: bookmarks,
      }),
    [bookId, chatMessages, pendingQuestions, bookmarks],
  );

  const baseNodes = useMemo(() => {
    if (chapters.length === 0) return [];
    return buildResolvedMapNodes(chapters, rawMockNodes);
  }, [chapters, rawMockNodes]);

  const stats = useMemo(
    () => getLittlePrinceMapStats(baseNodes),
    [baseNodes],
  );

  const liveCurrent: MapNode | null = useMemo(() => {
    const pid = progress?.paragraphId;
    if (pid == null || pid === "" || chapters.length === 0) return null;
    const resolved = resolveMapJumpTarget(chapters, pid, currentCh);
    return {
      id: "map-live-current",
      paragraphId: resolved.paragraphId,
      chapterIndex: resolved.chapterIndex,
      type: "current",
      timestamp: MAP_DEMO_NOW,
      payload: {
        title: "当前阅读位置",
        preview: "你离开地图时仍会停在这里；点按回到正文。",
      },
    };
  }, [progress, chapters, currentCh]);

  const session = mapSessionByBook[bookId];
  const filterTab = session?.filterTab ?? "all";

  const filtered = useMemo(() => {
    const fromMock = baseNodes.filter((n) => mapTabMatchesNode(filterTab, n));
    if (filterTab === "all" && liveCurrent) {
      const rest = fromMock.filter(
        (n) => n.paragraphId !== liveCurrent.paragraphId,
      );
      return [liveCurrent, ...rest];
    }
    return fromMock;
  }, [baseNodes, filterTab, liveCurrent]);

  useEffect(() => {
    const restore = () => {
      const top = useAppStore.getState().mapSessionByBook[bookId]?.scrollTop;
      const el = scrollRef.current;
      if (el != null && top != null && top > 0) el.scrollTop = top;
    };
    if (useAppStore.persist.hasHydrated()) queueMicrotask(restore);
    return useAppStore.persist.onFinishHydration(restore);
  }, [bookId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMapSession(bookId, { scrollTop: el.scrollTop });
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [bookId, setMapSession]);

  const clearLong = () => {
    if (longTimer.current) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  const onNodePointerDown = (node: MapNode) => {
    longTriggered.current = false;
    clearLong();
    longTimer.current = window.setTimeout(() => {
      longTriggered.current = true;
      longTimer.current = null;
      safeVibrate(12);
      setDetail(node);
    }, LONG_MS);
  };

  const onNodePointerUp = (node: MapNode) => {
    clearLong();
    if (!longTriggered.current) {
      safeVibrate(8);
      jumpToParagraph(node.paragraphId, node.chapterIndex);
    }
    longTriggered.current = false;
  };

  const interruptTowerGestures = () => {
    clearLong();
    longTriggered.current = false;
  };

  const onTowerReleased = (node: MapNode) => {
    onNodePointerUp(node);
  };

  const pendingCount = stats.pendingWaiting + pendingQuestions.length;

  if (!book) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0c0c0f] px-5 pb-10 pt-4 text-zinc-100">
        <p className="mt-12 text-center text-sm text-zinc-500">未找到书目</p>
      </div>
    );
  }

  if (!chaptersLoading && chapters.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0c0c0f] px-5 pb-10 pt-4 text-zinc-100">
        <header className="flex items-center gap-2 py-2">
          <button
            type="button"
            onClick={() => back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="返回"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </button>
          <h1
            style={{ viewTransitionName: `reading-map-hub-${bookId}` }}
            className="text-sm font-semibold text-zinc-300"
          >
            阅读地图
          </h1>
        </header>
        <p className="mt-12 px-6 text-center text-sm text-zinc-500">
          《{book.title}》暂无章节数据，可先连接数据库并完成章节入库。
        </p>
        <button
          type="button"
          onClick={() => toRead(bookId)}
          className="mx-auto mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
        >
          去阅读
        </button>
      </div>
    );
  }

  const mapTitle = `《${book.title}》阅读地图`;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0c0c0f] text-zinc-100">
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="sticky top-0 z-30 border-b border-white/[0.085] bg-[color-mix(in_oklch,#0c0c0f_86%,transparent)] backdrop-blur-xl"
      >
        <div className="flex h-12 items-center gap-1 px-1">
          <button
            type="button"
            onClick={() => back()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 hover:bg-white/5"
            aria-label="返回"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </button>
          <h1
            style={{ viewTransitionName: `reading-map-hub-${bookId}` }}
            className="min-w-0 flex-1 truncate text-center text-[0.8rem] font-semibold tracking-tight text-zinc-100"
          >
            {mapTitle}
          </h1>
          <button
            type="button"
            onClick={() => {
              setShareHint(true);
              window.setTimeout(() => setShareHint(false), 2800);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-white/5"
            aria-label="分享地图"
          >
            <Share2 className="size-[1.1rem]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="material-glass mx-3 mb-2 flex gap-1 overflow-x-auto rounded-2xl p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMapSession(bookId, { filterTab: t.id })}
              className={cn(
                "shrink-0 rounded-[0.92rem] px-4 py-2 text-[0.68rem] font-semibold transition-[background-color,color,transform]",
                filterTab === t.id
                  ? "scale-[1.02] bg-primary text-primary-foreground shadow-[0_10px_32px_-12px_color-mix(in_oklch,var(--primary)_68%,transparent)]"
                  : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.header>

      <motion.div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-2"
        style={{ willChange: "scroll-position" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.06, duration: 0.25 }}
      >
        <div className="relative mx-auto max-w-[430px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={filterTab}
              initial={{ opacity: 0.28, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0.12, y: -6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {chaptersLoading ? (
                <p className="py-16 text-center text-sm text-zinc-500">
                  正在加载章节…
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-16 text-center text-sm text-zinc-500">
                  这一栏暂无节点
                </p>
              ) : (
                <ReadingMapTimeTower
                  chapters={chapters}
                  nodes={filtered}
                  currentChapterIndex={currentCh}
                  liveParagraphId={progress?.paragraphId ?? null}
                  onNodePointerDown={onNodePointerDown}
                  onTowerNodeReleased={onTowerReleased}
                  onNodePointerInterrupt={interruptTowerGestures}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <footer className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-white/[0.08] bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur-lg">
        <p className="text-center text-[0.68rem] leading-relaxed text-zinc-400">
          已读 {readPct}% · {stats.dialogue} 段对话 · {stats.image} 张画面 ·{" "}
          {pendingCount} 个悬念待答
        </p>
      </footer>

      <AnimatePresence>
        {shareHint ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-none fixed bottom-24 left-1/2 z-50 w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 rounded-2xl border border-white/12 bg-zinc-900/95 px-4 py-3 text-center text-[0.78rem] text-zinc-200 shadow-lg"
          >
            请使用系统截屏（如电源键 + 音量）保存「我和《{book.title}》的地图」。导出功能开发中。
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detail ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭详情"
              className="fixed inset-0 z-[60] bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetail(null)}
            />
            <motion.div
              role="dialog"
              aria-modal
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="material-glass-dark fixed bottom-0 left-1/2 z-[70] w-full max-w-[430px] -translate-x-1/2 rounded-t-[1.35rem] border border-white/12 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-zinc-100 shadow-[0_-28px_64px_-18px_rgba(0,0,0,0.68)] backdrop-blur-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <div className="flex gap-3">
                {nodeIcon(detail.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-[0.7rem] text-zinc-500">
                    {formatRelativeTimePast(detail.timestamp, MAP_DEMO_NOW)}
                  </p>
                  {detail.payload.title ? (
                    <h2 className="mt-1 text-base font-semibold text-zinc-50">
                      {detail.payload.title}
                    </h2>
                  ) : null}
                  {detail.payload.characterName ? (
                    <p className="mt-1 text-sm text-emerald-300">
                      {detail.payload.characterName}
                    </p>
                  ) : null}
                  {detail.payload.pendingQuestion ? (
                    <p className="mt-3 text-sm leading-relaxed text-amber-100/95">
                      {detail.payload.pendingQuestion}
                    </p>
                  ) : null}
                  {detail.payload.preview ? (
                    <p className="mt-3 text-[0.9rem] leading-relaxed text-zinc-300">
                      {detail.payload.preview}
                    </p>
                  ) : null}
                  {detail.type === "image" ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                      {detail.payload.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detail.payload.imageUrl}
                          alt=""
                          className="max-h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="h-40 w-full bg-gradient-to-br from-sky-500/30 via-primary/15 to-amber-400/25" />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  jumpToParagraph(detail.paragraphId, detail.chapterIndex);
                }}
                className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
              >
                跳到正文段落
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
