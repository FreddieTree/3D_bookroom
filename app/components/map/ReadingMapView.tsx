"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  ChevronLeft,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Music,
  Share2,
  UserRound,
} from "lucide-react";

import { getBookById } from "@/app/lib/data/books";
import {
  computeReadProgressPercent,
  getChaptersForBook,
} from "@/app/lib/data/sample-content";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import {
  getLittlePrinceMapStats,
  getMapNodesForBook,
  MAP_DEMO_NOW,
  mapTabMatchesNode,
  type MapFilterTab,
  type MapNode,
} from "@/app/lib/mock/map-data";
import { useAppStore } from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";
import { formatRelativeTimePast } from "@/app/lib/utils/relative-time";
import { safeVibrate } from "@/app/lib/utils/vibrate";

const FILTER_TABS: { id: MapFilterTab; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "dialogue", label: "我的对话" },
  { id: "image", label: "画面" },
  { id: "character", label: "人物" },
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

function ThumbnailOrGradient({ node }: { node: MapNode }) {
  if (node.type !== "image") return null;
  if (node.payload.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- optional mock URL
      <img
        src={node.payload.imageUrl}
        alt=""
        className="mt-2 h-14 w-20 shrink-0 rounded-lg object-cover opacity-90"
      />
    );
  }
  return (
    <div
      className="mt-2 h-14 w-20 shrink-0 rounded-lg bg-gradient-to-br from-sky-500/25 via-primary/15 to-amber-500/20 ring-1 ring-white/10"
      aria-hidden
    />
  );
}

type ReadingMapViewProps = {
  bookId: string;
};

export function ReadingMapView({ bookId }: ReadingMapViewProps) {
  const router = useRouter();
  const { back, toRead } = useNavigation();
  const toReadParagraph = useCallback(
    (paragraphId: string) => {
      router.push(`/book/${bookId}/read?p=${encodeURIComponent(paragraphId)}`);
    },
    [bookId, router],
  );

  const book = getBookById(bookId);
  const chapters = getChaptersForBook(bookId);
  const readerProgressByBook = useAppStore((s) => s.readerProgressByBook);
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const mapSessionByBook = useAppStore((s) => s.mapSessionByBook);
  const setMapSession = useAppStore((s) => s.setMapSession);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<MapNode | null>(null);
  const [shareHint, setShareHint] = useState(false);
  const longTimer = useRef<number | null>(null);
  const longTriggered = useRef(false);

  const progress = readerProgressByBook[bookId];
  const readPct = useMemo(
    () => computeReadProgressPercent(bookId, progress),
    [bookId, progress],
  );
  const currentCh = progress?.chapterIndex ?? 0;

  const baseNodes = useMemo(() => getMapNodesForBook(bookId), [bookId]);
  const stats = useMemo(() => getLittlePrinceMapStats(baseNodes), [baseNodes]);

  const liveCurrent: MapNode | null = useMemo(() => {
    if (bookId !== "little-prince" || !progress?.paragraphId) return null;
    return {
      id: "map-live-current",
      paragraphId: progress.paragraphId,
      chapterIndex: progress.chapterIndex,
      type: "current",
      timestamp: MAP_DEMO_NOW,
      payload: {
        title: "当前阅读位置",
        preview: "你离开地图时仍会停在这里；点按回到正文。",
      },
    };
  }, [bookId, progress]);

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
      toReadParagraph(node.paragraphId);
    }
    longTriggered.current = false;
  };

  const pendingCount = stats.pendingWaiting + pendingQuestions.length;

  if (!book || bookId !== "little-prince" || !chapters?.length) {
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
          <h1 className="text-sm font-semibold text-zinc-300">阅读地图</h1>
        </header>
        <p className="mt-12 text-center text-sm text-zinc-500">
          《{book?.title ?? "本书"}》地图尚在筹备，请先阅读已开放书目。
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
        className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0c0c0f]/90 backdrop-blur-md"
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
          <h1 className="min-w-0 flex-1 truncate text-center text-[0.8rem] font-semibold tracking-tight text-zinc-100">
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

        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMapSession(bookId, { filterTab: t.id })}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                filterTab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-zinc-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.header>

      <motion.div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-4"
        style={{ willChange: "scroll-position" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.06, duration: 0.25 }}
      >
        <div className="relative mx-auto max-w-[430px]">
          <div className="pointer-events-none absolute bottom-0 left-[24.5%] top-0 w-px bg-white/[0.09]" />

          <motion.ul
            className="relative z-[1] space-y-0"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.042, delayChildren: 0.08 },
              },
            }}
            initial="hidden"
            animate="show"
          >
            {filtered.map((node, i) => {
              const prevCh = i > 0 ? filtered[i - 1]!.chapterIndex : -1;
              const showChHeader = node.chapterIndex !== prevCh;
              const ch = chapters[node.chapterIndex];
              const chTitle = ch?.title ?? `第 ${node.chapterIndex + 1} 章`;
              const isUnread = node.chapterIndex > currentCh;
              const isCurrentCh = node.chapterIndex === currentCh;
              const isReadPast = node.chapterIndex < currentCh;

              return (
                <motion.li
                  key={node.id}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { type: "spring", stiffness: 400, damping: 28 },
                    },
                  }}
                  className="flex gap-2 pb-5"
                >
                  <div
                    className={cn(
                      "box-border w-[25%] shrink-0 border-r border-white/[0.07] pr-2 pt-0.5",
                      isReadPast && "bg-emerald-950/20",
                      isCurrentCh &&
                        "bg-amber-500/[0.07] ring-1 ring-amber-500/40 ring-inset",
                      isUnread && "opacity-[0.42] grayscale",
                    )}
                  >
                    {showChHeader ? (
                      <>
                        <p className="text-[0.65rem] font-semibold leading-tight text-zinc-300">
                          {chTitle}
                        </p>
                        <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full bg-white/25" />
                      </>
                    ) : (
                      <div className="mx-auto min-h-[2.5rem] w-px flex-1 bg-gradient-to-b from-white/12 to-white/[0.02]" />
                    )}
                  </div>

                  <div className="w-[75%] min-w-0 pl-1">
                    <motion.button
                      type="button"
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-left shadow-none outline-none transition-[border-color,background-color] hover:border-white/[0.12] hover:bg-white/[0.05]"
                      whileTap={{ scale: 0.985 }}
                      style={{ willChange: "transform" }}
                      onPointerDown={() => onNodePointerDown(node)}
                      onPointerUp={() => onNodePointerUp(node)}
                      onPointerCancel={clearLong}
                      onPointerLeave={() => {
                        clearLong();
                        longTriggered.current = false;
                      }}
                    >
                      <div className="flex gap-2.5">
                        {nodeIcon(node.type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.7rem] text-zinc-500 tabular-nums">
                            {formatRelativeTimePast(node.timestamp, MAP_DEMO_NOW)}
                          </p>
                          {node.payload.title ? (
                            <p className="mt-0.5 text-[0.85rem] font-semibold leading-snug text-zinc-100">
                              {node.payload.title}
                            </p>
                          ) : null}
                          {node.payload.characterName ? (
                            <p className="mt-0.5 text-[0.72rem] font-medium text-emerald-300/90">
                              {node.payload.characterName}
                            </p>
                          ) : null}
                          {node.payload.preview ? (
                            <p className="mt-1 line-clamp-2 text-[0.72rem] leading-relaxed text-zinc-400">
                              {node.payload.preview}
                            </p>
                          ) : null}
                          {node.type === "pending" &&
                          node.payload.pendingQuestion ? (
                            <p className="mt-1 text-[0.7rem] italic text-amber-200/80">
                              「{node.payload.pendingQuestion.slice(0, 80)}
                              {node.payload.pendingQuestion.length > 80
                                ? "…"
                                : ""}
                              」
                            </p>
                          ) : null}
                          <ThumbnailOrGradient node={node} />
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>

          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              这一栏暂无节点
            </p>
          ) : null}
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
              className="fixed bottom-0 left-1/2 z-[70] w-full max-w-[430px] -translate-x-1/2 rounded-t-2xl border border-white/10 bg-[#121216] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.7)]"
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
                  toReadParagraph(detail.paragraphId);
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
