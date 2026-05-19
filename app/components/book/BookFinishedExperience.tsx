"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Pause,
  Play,
  QrCode,
  Share2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  formatFinishedSubtitle,
  getFinishedDemoStats,
  LITTLE_PRINCE_EMOTION_DATA,
  MOCK_GOOD_QUESTIONS,
  MOCK_SILENT_AUDIO,
  themeSongTitle,
} from "@/app/lib/mock/finished-celebration";
import type { BookMeta } from "@/app/lib/data/books";
import { getBookById } from "@/app/lib/data/books";
import { AnimatedTitle } from "@/app/components/typography/AnimatedTitle";
import { RollingNumber } from "@/app/components/typography/RollingNumber";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import type { ParagraphVisual } from "@/app/lib/stores/appStore";
import { useAppStore } from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";

const PLACEHOLDER_VISUALS: Pick<
  ParagraphVisual,
  "id" | "emoji" | "colorFrom" | "colorTo" | "createdAt"
>[] = [
  { id: "ph0", emoji: "🌙", colorFrom: "#4a3f7c", colorTo: "#b8763e", createdAt: 0 },
  { id: "ph1", emoji: "🦊", colorFrom: "#2d4a3e", colorTo: "#7a9e8e", createdAt: 0 },
  { id: "ph2", emoji: "🌹", colorFrom: "#6b2d3a", colorTo: "#c98a9b", createdAt: 0 },
  { id: "ph3", emoji: "✨", colorFrom: "#3d342b", colorTo: "#e8c088", createdAt: 0 },
  { id: "ph4", emoji: "🪐", colorFrom: "#1f3340", colorTo: "#5d8aa8", createdAt: 0 },
  { id: "ph5", emoji: "📖", colorFrom: "#3d342b", colorTo: "#8a7a6a", createdAt: 0 },
];

function collectVisualsForBook(
  bookId: string,
  map: Record<string, Record<string, ParagraphVisual[]>>,
  max = 8,
): ParagraphVisual[] {
  const byBook = map[bookId];
  if (!byBook) return [];
  const all = Object.values(byBook).flat();
  all.sort((a, b) => b.createdAt - a.createdAt);
  return all.slice(0, max);
}

function padVisuals(list: ParagraphVisual[]): ParagraphVisual[] {
  const target = Math.max(list.length, 6);
  if (list.length >= target) return list.slice(0, target);
  const out = [...list];
  let i = 0;
  while (out.length < target) {
    const p = PLACEHOLDER_VISUALS[out.length % PLACEHOLDER_VISUALS.length]!;
    out.push({ ...p, id: `${p.id}-pad-${i}` });
    i += 1;
  }
  return out;
}

function GoldDrift({ reduced }: { reduced: boolean }) {
  const seeds = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: `${8 + ((i * 47) % 84)}%`,
        delay: (i % 4) * 0.05,
      })),
    [],
  );

  const [living, setLiving] = useState(true);
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setLiving(false), 3200);
    return () => window.clearTimeout(t);
  }, [reduced]);

  if (reduced || !living) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[min(72dvh,_520px)] overflow-hidden"
      aria-hidden
    >
      {seeds.map((s) => (
        <motion.span
          key={s.id}
          className="absolute top-[-16px] block h-[3px] w-[3px] rounded-full bg-amber-200/94 shadow-[0_0_10px_color-mix(in_oklch,var(--primary)_65%,transparent)]"
          style={{ left: s.left }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0.65, 0],
            y: [0, 120 + (s.id % 7) * 36, 220 + (s.id % 5) * 24],
          }}
          transition={{
            duration: 3.1,
            delay: s.delay + 0.12,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

function ReaderEntryVeil({
  active,
  reduce,
  title,
}: {
  active: boolean;
  reduce: boolean;
  title: string;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || reduce) return;
    const t = window.setTimeout(() => setDone(true), 2400);
    return () => window.clearTimeout(t);
  }, [active, reduce]);

  if (!active || reduce || done) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black text-center font-serif"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.15, 0.94, 0.94, 0] }}
        transition={{ duration: 2.25, times: [0, 0.28, 0.72, 1] }}
      />
      <motion.div
        className="relative z-[1] px-10"
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{
          opacity: [0, 1, 1, 0],
          y: [22, 0, 2, -8],
        }}
        transition={{ duration: 2.1, times: [0, 0.34, 0.74, 1] }}
      >
        <div className="text-[clamp(2.85rem,_12vw,_3.6rem)] font-semibold tracking-tight text-zinc-100">
          <AnimatedTitle text="读完了" />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.92, 0] }}
          transition={{ duration: 2, delay: 0.25, times: [0, 0.45, 1] }}
          className="mt-5 text-sm tracking-[0.4em] text-zinc-500"
        >
          {title}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

function RevealSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{
        duration: 0.62,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.section>
  );
}

function PeakDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as unknown as {
    cx?: number;
    cy?: number;
    payload: (typeof LITTLE_PRINCE_EMOTION_DATA)[number];
  };

  const p = payload;
  if (cx == null || cy == null) return <g />;

  if (p.peak) {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill="var(--color-primary)"
          stroke="color-mix(in oklch, var(--color-background) 55%, transparent)"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          fontSize={12}
          fill="color-mix(in oklch, var(--color-primary) 78%, transparent)"
        >
          ✦
        </text>
        {p.peakLabel ? (
          <text
            x={cx}
            y={cy - 18}
            textAnchor="middle"
            fill="var(--color-foreground)"
            fontSize={10}
            fontWeight={600}
          >
            {p.peakLabel}
          </text>
        ) : null}
      </g>
    );
  }
  return (
    <circle cx={cx} cy={cy} r={4} fill="color-mix(in oklch, var(--color-primary) 55%, transparent)" opacity={0.55} />
  );
}

function EmotionChartFloated({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      className={cn(
        "relative rounded-[1.2rem] border border-primary/26 bg-muted/18 p-[0.92rem]",
        "shadow-[var(--shadow-elevation-3),inset_0_1px_0_color-mix(in_oklch,white_10%,transparent)]",
      )}
      initial={{ rotateX: 8, rotateY: -8, opacity: 0.85 }}
      whileInView={{ rotateX: 4, rotateY: -5, opacity: 1 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      style={{
        perspective: "1200px",
        transformOrigin: "50% 50%",
        transformStyle: "preserve-3d",
      }}
    >
      <p className="mb-1 pl-2 font-sans text-xs font-semibold text-muted-foreground">
        情绪强度轨迹
      </p>
      <ResponsiveContainer width="100%" height={252}>
        <LineChart data={LITTLE_PRINCE_EMOTION_DATA} margin={{ top: 32, right: 12, left: -4, bottom: 2 }}>
          <defs>
            <linearGradient id="readerLineGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="color-mix(in oklch, var(--primary) 78%, transparent)" />
              <stop offset="100%" stopColor="color-mix(in oklch, var(--accent) 92%, transparent)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="color-mix(in oklch, var(--border) 82%, transparent)" />
          <XAxis
            dataKey="chapter"
            tick={{ fontSize: 11, fill: "color-mix(in oklch, var(--muted-foreground) 90%, transparent)" }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis domain={[0, 100]} hide width={0} />
          <Tooltip
            cursor={{ stroke: "color-mix(in oklch, var(--primary) 28%, transparent)" }}
            contentStyle={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "var(--shadow-soft)",
            }}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as { peakLabel?: string } | undefined;
              if (item?.peakLabel) return `${String(label)} · ${item.peakLabel}`;
              return String(label);
            }}
            formatter={(value: number) => [`${value}`, "强度"]}
          />
          <Line
            type="monotone"
            dataKey="intensity"
            stroke="url(#readerLineGrad)"
            strokeWidth={3.1}
            dot={(dotProps) => <PeakDot {...dotProps} />}
            activeDot={{ r: 10, fill: "var(--color-accent)", stroke: "var(--color-background)", strokeWidth: 2 }}
            isAnimationActive={!reduced}
            animationDuration={2000}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

function ThemeVinyl({
  title,
  reduced,
}: {
  title: string;
  reduced: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      void el.pause();
      return;
    }
    void el.play().catch(() => {});
  };

  return (
    <div className="material-glass relative overflow-hidden rounded-[1.25rem] border border-primary/25 p-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="font-serif text-lg font-semibold text-foreground">{title}</p>
        <div className="relative flex size-[200px] items-center justify-center">
          {[0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              aria-hidden
              className="pointer-events-none absolute rounded-full border border-primary/25"
              style={{
                inset: `${12 + ring * 18}px`,
              }}
              animate={
                playing && !reduced
                  ? {
                      scale: [1, 1.02, 1],
                      opacity: [0.25, 0.55, 0.25],
                    }
                  : { opacity: 0.15 }
              }
              transition={{
                duration: 2.35 + ring * 0.25,
                repeat: playing ? Infinity : 0,
                ease: "easeInOut",
              }}
            />
          ))}
          <motion.button
            type="button"
            onClick={toggle}
            className={cn(
              "relative grid size-[200px] place-items-center rounded-full border border-white/35",
              "bg-gradient-to-br from-muted/45 via-background to-primary/35 text-foreground",
              "shadow-[0_32px_60px_-32px_color-mix(in_oklch,var(--primary)_68%,transparent)]",
            )}
            animate={playing ? { rotate: reduced ? 0 : 360 } : { rotate: 0 }}
            transition={{
              rotate: playing
                ? { repeat: Infinity, duration: 10, ease: "linear" }
                : { type: "spring", stiffness: 320, damping: 28 },
            }}
            aria-label={playing ? "暂停主题曲" : "播放主题曲试听"}
          >
            <span className="pointer-events-none absolute inset-[34%] rounded-full border border-black/38 bg-muted/82 shadow-inner" />
            {playing ? (
              <Pause className="relative z-[2] size-10 text-primary drop-shadow-md" strokeWidth={1.75} />
            ) : (
              <Play className="relative z-[2] size-11 text-primary drop-shadow-md" strokeWidth={1.7} />
            )}
          </motion.button>
        </div>
        <audio
          ref={audioRef}
          className="hidden"
          src={MOCK_SILENT_AUDIO}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <p className="max-w-[19rem] font-sans text-xs leading-relaxed text-muted-foreground">
          试听片段将随版本更新为正式曲目。圆盘随播放轻旋，光晕随节拍呼吸。
        </p>
      </div>
    </div>
  );
}

function BookFinishedInner({ bookId }: { bookId: string }) {
  const book: BookMeta | undefined = useMemo(() => getBookById(bookId), [bookId]);
  const { toHome, toRead } = useNavigation();
  const params = useSearchParams();
  const celebrate = params.get("celebrate") === "1";

  const chatMessages = useAppStore((s) => s.chatMessages);
  const pendingQuestions = useAppStore((s) => s.pendingQuestions);
  const paragraphVisualsByBook = useAppStore((s) => s.paragraphVisualsByBook);
  const reduceMotion = useReducedMotion();

  const [shareOpen, setShareOpen] = useState(false);

  const userTurns = useMemo(
    () => chatMessages.filter((m) => m.role === "user").length,
    [chatMessages],
  );

  const title = book?.title ?? "未命名书籍";
  const legacySubtitle = formatFinishedSubtitle(title, userTurns);
  const stats = getFinishedDemoStats(userTurns);
  const songTitle = themeSongTitle(title);

  const visuals = useMemo(
    () => padVisuals(collectVisualsForBook(bookId, paragraphVisualsByBook)),
    [bookId, paragraphVisualsByBook],
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ReaderEntryVeil active={celebrate} reduce={!!reduceMotion} title={title} />
      <GoldDrift reduced={!!reduceMotion} />

      <div className="relative z-[1] px-0">
        <PageHeader
          title={title}
          subtitle="读完啦"
          right={
            <span className="font-sans pr-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              仪式
            </span>
          }
          className="border-transparent bg-background/88"
          elevated
        />
      </div>

      <main className="relative z-[1] flex flex-1 flex-col px-5 pb-32 pt-2 sm:px-7">
        <motion.header
          className="mb-10 space-y-4 text-center"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={cn(
              "font-serif text-[clamp(2.4rem,10.5vw,3.8rem)] font-semibold leading-[1.02] tracking-tight",
              "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500/95 bg-clip-text text-transparent",
              "drop-shadow-[0_10px_38px_color-mix(in_oklch,var(--primary)_26%,transparent)]",
            )}
          >
            <AnimatedTitle key={bookId} text={`《${title}》`} />
          </div>
          <motion.p
            className="font-sans text-sm font-medium tabular-nums text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16, duration: 0.45 }}
          >
            <RollingNumber value={stats.days} minDigits={1} />
            <span> 天 · </span>
            <RollingNumber value={stats.dialogues} minDigits={1} />
            <span> 段对话 · </span>
            <RollingNumber value={stats.images} minDigits={1} />
            <span> 张画面</span>
          </motion.p>
          <motion.p
            className="mx-auto max-w-[22rem] font-sans text-sm leading-relaxed text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.5 }}
          >
            {legacySubtitle}
          </motion.p>
        </motion.header>

        <div className="space-y-12">
          <RevealSection>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              情绪曲线
            </h2>
            <EmotionChartFloated reduced={!!reduceMotion} />
          </RevealSection>

          <RevealSection delay={0.04}>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              你和这本书
            </h2>

            <div className="space-y-8">
              <div>
                <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  精选对话
                </p>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {MOCK_GOOD_QUESTIONS.map((q) => (
                    <motion.article
                      key={q.id}
                      whileHover={{ rotateY: -5, y: -2 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className={cn(
                        "material-glass preserve-3d min-w-[min(88vw,320px)] shrink-0 snap-center rounded-[1.1rem]",
                        "border border-white/35 p-[1.05rem] shadow-[var(--shadow-elevation-3)]",
                        "dark:border-white/10",
                      )}
                      style={{ transformStyle: "preserve-3d", perspective: 900 }}
                    >
                      <p className="font-serif text-[0.96rem] leading-relaxed text-foreground">
                        「{q.quote}」
                      </p>
                      <p className="mt-3 font-sans text-xs text-muted-foreground">
                        {q.chapter}
                      </p>
                    </motion.article>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  生成的图
                </p>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visuals.map((v) => (
                    <motion.article
                      key={v.id}
                      whileHover={{ rotateY: 6 }}
                      transition={{ type: "spring", stiffness: 340, damping: 30 }}
                      className={cn(
                        "preserve-3d relative aspect-square min-w-[32%] max-w-[9.75rem]",
                        "shrink-0 snap-center overflow-hidden rounded-[1rem]",
                        "border border-white/40 shadow-[var(--shadow-elevation-2)] dark:border-white/10",
                      )}
                      style={{
                        perspective: "800px",
                        background: `linear-gradient(138deg, ${v.colorFrom}, ${v.colorTo})`,
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[1.96rem] drop-shadow-lg">
                        {v.emoji}
                      </span>
                    </motion.article>
                  ))}
                </div>
              </div>

              {pendingQuestions.length > 0 ? (
                <motion.div
                  className={cn(
                    "material-glass rounded-[1.1rem] border border-dashed border-primary/35 px-5 py-[1.05rem]",
                  )}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    未答悬念
                  </p>
                  <ul className="mt-2 space-y-2 font-sans text-sm text-foreground">
                    {pendingQuestions.slice(0, 4).map((q) => (
                      <li key={q.id} className="leading-snug">
                        · {q.userQuestion}
                        <span className="ml-1 text-xs text-muted-foreground">
                          （第 {q.revealAfterChapter} 章后揭晓）
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </div>
          </RevealSection>

          <RevealSection delay={0.08}>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              主题曲
            </h2>
            <ThemeVinyl title={songTitle} reduced={!!reduceMotion} />
          </RevealSection>

          <RevealSection delay={0.1}>
            <div className="flex flex-col gap-3 pt-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => setShareOpen(true)}
                className="font-sans inline-flex h-12 items-center justify-center gap-2 rounded-[1.05rem] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-semibold text-zinc-950 shadow-[0_14px_38px_-16px_color-mix(in_oklch,var(--primary)_68%,transparent)]"
              >
                <Share2 className="size-4" strokeWidth={1.75} />
                生成分享卡
              </motion.button>
              <button
                type="button"
                className="font-sans inline-flex h-12 items-center justify-center rounded-[1.05rem] bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-[0.99]"
                onClick={() => {
                  void navigator.clipboard?.writeText?.(
                    `分享我的《${title}》之旅 —— ${legacySubtitle}`,
                  );
                }}
              >
                分享我的{title}之旅
              </button>
              <button
                type="button"
                className="font-sans inline-flex h-12 w-full items-center justify-center rounded-[1.05rem] border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
                onClick={() => toHome()}
              >
                再读一本
              </button>
              <button
                type="button"
                className="font-sans inline-flex h-12 w-full items-center justify-center rounded-[1.05rem] border border-transparent text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => toRead(bookId)}
              >
                回到这本书
              </button>
            </div>
          </RevealSection>
        </div>
      </main>

      <AnimatePresence>
        {shareOpen ? (
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="share-card-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/48 px-4 pb-8 pt-16 backdrop-blur-[3px] sm:items-center sm:pb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              className={cn(
                "material-glass w-full max-w-sm rounded-[1.35rem] border border-white/16 p-6 text-left",
                "shadow-[0_40px_88px_-40px_color-mix(in_oklch,black_55%,var(--primary))]",
              )}
              initial={{ y: 48, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                id="share-card-title"
                className="font-serif text-xl font-semibold text-foreground"
              >
                旅程分享卡
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                《{title}》· 已读 · {stats.dialogues} 段对话 · {stats.images} 张画面
              </p>
              <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="space-y-2 font-sans text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">关键好奇</p>
                  <p className="leading-relaxed">
                    「{MOCK_GOOD_QUESTIONS[0]?.quote ?? "这本书改变了我的一瞬。"}」
                  </p>
                  <p className="pt-1 text-[0.65rem] uppercase tracking-[0.18em]">
                    主题曲 · 扫码聆听
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-primary/45 bg-background/70 p-3">
                  <QrCode className="size-12 text-primary" strokeWidth={1.5} />
                  <span className="text-[0.55rem] text-muted-foreground">二维码 · Mock</span>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-sm font-semibold text-zinc-950"
                  onClick={() =>
                    window.alert("请使用系统截屏或「存储到照片」保存分享卡。")
                  }
                >
                  保存到相册
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm font-medium"
                  onClick={() => setShareOpen(false)}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type BookFinishedExperienceProps = {
  bookId: string;
};

export function BookFinishedExperience({ bookId }: BookFinishedExperienceProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50dvh] flex-1 items-center justify-center text-sm text-muted-foreground">
          正在展开读完仪式…
        </div>
      }
    >
      <BookFinishedInner bookId={bookId} />
    </Suspense>
  );
}
