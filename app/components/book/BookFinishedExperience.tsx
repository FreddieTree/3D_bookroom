"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  formatFinishedSubtitle,
  LITTLE_PRINCE_EMOTION_DATA,
  MOCK_GOOD_QUESTIONS,
  MOCK_SILENT_AUDIO,
  themeSongTitle,
} from "@/app/lib/mock/finished-celebration";
import type { BookMeta } from "@/app/lib/data/books";
import { getBookById } from "@/app/lib/data/books";
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
  max = 6,
): ParagraphVisual[] {
  const byBook = map[bookId];
  if (!byBook) return [];
  const all = Object.values(byBook).flat();
  all.sort((a, b) => b.createdAt - a.createdAt);
  return all.slice(0, max);
}

function padVisuals(list: ParagraphVisual[]): ParagraphVisual[] {
  if (list.length >= 6) return list.slice(0, 6);
  const out = [...list];
  let i = 0;
  while (out.length < 6) {
    const p = PLACEHOLDER_VISUALS[out.length % PLACEHOLDER_VISUALS.length]!;
    out.push({
      ...p,
      id: `${p.id}-pad-${i}`,
    });
    i += 1;
  }
  return out;
}

function Fireworks({ reducedMotion }: { reducedMotion: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        leftPct: 12 + ((i * 47) % 76),
        delay: (i % 5) * 0.08,
      })),
    [],
  );

  if (reducedMotion) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,400px)] overflow-hidden"
      aria-hidden
    >
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute top-[38%] h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
          style={{ left: `${s.leftPct}%` }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0.85, 0],
            y: [0, -30 - (s.id % 5) * 14, -90 - (s.id % 7) * 10],
            x: [
              0,
              ((s.id % 2 === 0 ? 1 : -1) * (18 + (s.id % 6) * 8)) / 2,
              ((s.id % 2 === 0 ? 1 : -1) * (38 + (s.id % 9) * 6)),
            ],
            scale: [0, 1.4, 0.75, 0.2],
          }}
          transition={{
            duration: 1.85,
            delay: s.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

function FallingSparkles({ reducedMotion }: { reducedMotion: boolean }) {
  const flakes = useMemo(
    () =>
      ["✦", "✧", "·", "˖", "✶"].map((ch, i) => ({
        id: `flake-${i}`,
        ch,
        left: 8 + (i * 19) % 84,
        duration: 10 + (i % 4) * 2.5,
        delay: i * 0.7,
      })),
    [],
  );

  if (reducedMotion) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[22vh] bottom-0 overflow-hidden opacity-[0.45]"
      aria-hidden
    >
      {flakes.map((f) => (
        <motion.span
          key={f.id}
          className="absolute text-sm text-primary"
          style={{ left: `${f.left}%`, top: "-4%" }}
          animate={{ y: ["0vh", "120vh"], rotate: [0, 18, -8, 22] }}
          transition={{
            duration: f.duration,
            repeat: Infinity,
            ease: "linear",
            delay: f.delay,
          }}
        >
          {f.ch}
        </motion.span>
      ))}
    </div>
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
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{
        duration: 0.58,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.section>
  );
}

function EmotionChart() {
  return (
    <div className="relative rounded-2xl border border-border/80 bg-muted/25 p-4 pr-2">
      <p className="mb-1 font-sans text-xs font-medium text-muted-foreground">
        情绪强度轨迹（演示）
      </p>
      <ResponsiveContainer width="100%" height={244}>
        <LineChart
          data={LITTLE_PRINCE_EMOTION_DATA}
          margin={{ top: 28, right: 12, left: -8, bottom: 2 }}
        >
          <CartesianGrid
            strokeDasharray="3 6"
            className="stroke-border/50"
            vertical={false}
          />
          <XAxis
            dataKey="chapter"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            hide
            width={0}
          />
          <Tooltip
            cursor={{
              stroke: "color-mix(in oklch, var(--primary) 28%, transparent)",
            }}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "var(--shadow-soft)",
            }}
            labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
            formatter={(value: number) => [`${value}`, "情绪强度"]}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as
                | { peakLabel?: string }
                | undefined;
              if (item?.peakLabel)
                return `${String(label)} · ${item.peakLabel}`;
              return String(label);
            }}
          />
          <Line
            type="monotone"
            dataKey="intensity"
            stroke="var(--primary)"
            strokeWidth={2.75}
            dot={(dotProps) => {
              const { cx, cy, payload } = dotProps;
              const p = payload as (typeof LITTLE_PRINCE_EMOTION_DATA)[number];
              if (cx == null || cy == null) return <g key={`empty-${p.chapter}`} />;
              if (p.peak) {
                return (
                  <g key={`dot-${p.chapter}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={7}
                      fill="var(--primary)"
                      opacity={0.95}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill="none"
                      stroke="color-mix(in oklch, var(--primary) 35%, transparent)"
                      strokeWidth={1}
                    />
                    {p.peakLabel ? (
                      <text
                        x={cx}
                        y={cy - 16}
                        textAnchor="middle"
                        fill="var(--foreground)"
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
                <circle
                  key={`dot-${p.chapter}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="var(--primary)"
                  opacity={0.45}
                />
              );
            }}
            activeDot={{ r: 9, fill: "var(--accent)", stroke: "var(--background)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type BookFinishedExperienceProps = {
  bookId: string;
};

export function BookFinishedExperience({ bookId }: BookFinishedExperienceProps) {
  const book: BookMeta | undefined = useMemo(() => getBookById(bookId), [bookId]);
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
  const subtitle = formatFinishedSubtitle(title, userTurns);

  const visuals = useMemo(
    () => padVisuals(collectVisualsForBook(bookId, paragraphVisualsByBook)),
    [bookId, paragraphVisualsByBook],
  );

  const songTitle = themeSongTitle(title);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Fireworks reducedMotion={!!reduceMotion} />
      <FallingSparkles reducedMotion={!!reduceMotion} />

      <div className="relative z-[1] flex items-center justify-between px-5 pt-3 pb-2">
        <Link
          href={`/book/${bookId}/read`}
          prefetch={false}
          className="font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          返回阅读
        </Link>
        <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          庆祝
        </span>
      </div>

      <main className="relative z-[1] flex flex-1 flex-col px-5 pb-28 pt-2 sm:px-7">
        <motion.header
          className="mb-8 space-y-3 text-center"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="font-serif text-[clamp(2.65rem,11vw,3.55rem)] font-semibold leading-[1.05] tracking-tight text-foreground"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55 }}
          >
            读完了
          </motion.p>
          <motion.p
            className="mx-auto max-w-[20rem] font-sans text-sm leading-relaxed text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            {subtitle}
          </motion.p>
        </motion.header>

        <div className="space-y-10">
          <RevealSection>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              情绪曲线
            </h2>
            <EmotionChart />
          </RevealSection>

          <RevealSection delay={0.05}>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              我和这本书
            </h2>

            <div className="space-y-6">
              <div>
                <p className="mb-2 font-sans text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  你问过的好问题
                </p>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {MOCK_GOOD_QUESTIONS.map((q) => (
                    <article
                      key={q.id}
                      className="min-w-[min(88vw,320px)] shrink-0 snap-center rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-background p-4 shadow-[var(--shadow-soft)]"
                    >
                      <p className="font-serif text-[0.9375rem] leading-relaxed text-foreground">
                        「{q.quote}」
                      </p>
                      <p className="mt-3 font-sans text-xs text-muted-foreground">
                        {q.chapter}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-sans text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  你生成的画面
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {visuals.map((v) => (
                    <div
                      key={v.id}
                      className="relative aspect-square overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${v.colorFrom}, ${v.colorTo})`,
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-2xl drop-shadow-md">
                        {v.emoji}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {pendingQuestions.length > 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-4">
                  <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
                    未揭晓的悬念
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
                </div>
              ) : null}
            </div>
          </RevealSection>

          <RevealSection delay={0.08}>
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              主题曲
            </h2>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="font-serif text-base font-medium text-foreground">
                {songTitle}
              </p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                占位音频（演示）— 可播放验证控件
              </p>
              <audio
                controls
                className="mt-3 w-full"
                src={MOCK_SILENT_AUDIO}
                preload="metadata"
              >
                您的浏览器不支持音频播放。
              </audio>
              <button
                type="button"
                onClick={() =>
                  window.alert("下载已加入队列（演示功能，敬请期待）。")
                }
                className="font-sans mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                下载
              </button>
            </div>
          </RevealSection>

          <RevealSection delay={0.1}>
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="font-sans inline-flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] active:scale-[0.99]"
              >
                分享我的{title}之旅
              </button>
              <Link
                href="/"
                prefetch={false}
                className="font-sans inline-flex h-12 items-center justify-center rounded-2xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                再读一本
              </Link>
              <Link
                href={`/book/${bookId}/read`}
                prefetch={false}
                className="font-sans inline-flex h-12 items-center justify-center rounded-2xl border border-transparent text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                回到这本书
              </Link>
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-8 pt-16 backdrop-blur-[2px] sm:items-center sm:pb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              className={cn(
                "w-full max-w-sm rounded-[1.35rem] border border-white/10 p-6 text-left",
                "bg-gradient-to-br from-[color-mix(in_oklch,var(--primary)_22%,var(--background))]",
                "via-background to-[color-mix(in_oklch,var(--accent)_12%,var(--background))]",
                "shadow-[0_24px_80px_-24px_color-mix(in_oklch,black_55%,var(--primary))]",
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
                旅程卡片已生成
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                「{subtitle}」—— 这张分享卡用于商业模式评委预览，导出与社交平台对接稍后上线。
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground"
                  onClick={() =>
                    window.alert("已复制文案到剪贴板（演示：浏览器可能拦截）。")
                  }
                >
                  复制文案
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border text-sm font-medium"
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
