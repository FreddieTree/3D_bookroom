"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import {
  Bookmark,
  BookOpen,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Music,
  UserRound,
} from "lucide-react";

import type { ChapterContent } from "@/app/lib/data/sample-content";
import type { MapNode } from "@/app/lib/mock/map-data";
import { cn } from "@/app/lib/utils";

export const SEGMENT_HEIGHT = 218;
const ORBIT_Z = 90;
const SPIRAL_STEP = 40;

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function orbIcon(type: MapNode["type"]) {
  switch (type) {
    case "current":
      return (
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_16px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/38" />
          <span className="relative text-[0.58rem] font-bold">读</span>
        </span>
      );
    case "chapter":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-500/22 text-zinc-200 ring-1 ring-white/10">
          <BookOpen className="size-[0.95rem]" strokeWidth={1.75} />
        </span>
      );
    case "image":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/22 text-sky-200">
          <ImageIcon className="size-[1.12rem]" strokeWidth={1.75} />
        </span>
      );
    case "dialogue":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/22 text-violet-100">
          <MessageCircle className="size-[1.12rem]" strokeWidth={1.75} />
        </span>
      );
    case "character":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/22 text-emerald-100">
          <UserRound className="size-[1.12rem]" strokeWidth={1.75} />
        </span>
      );
    case "pending":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/14 text-amber-100 ring-1 ring-amber-400/32">
          <Lock className="size-[1.02rem]" strokeWidth={1.85} />
        </span>
      );
    case "bookmark":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/14 text-rose-100">
          <Bookmark className="size-[1.12rem]" strokeWidth={1.75} />
        </span>
      );
    case "bgm":
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/14 text-fuchsia-100">
          <Music className="size-[1.06rem]" strokeWidth={1.75} />
        </span>
      );
    default:
      return null;
  }
}

type ReadingMapTimeTowerProps = {
  chapters: ChapterContent[];
  nodes: MapNode[];
  currentChapterIndex: number;
  liveParagraphId: string | null;
  onNodePointerDown: (node: MapNode) => void;
  onTowerNodeReleased: (node: MapNode) => void;
  onNodePointerInterrupt: () => void;
};

export function ReadingMapTimeTower({
  chapters,
  nodes,
  currentChapterIndex,
  liveParagraphId,
  onNodePointerDown,
  onTowerNodeReleased,
  onNodePointerInterrupt,
}: ReadingMapTimeTowerProps) {
  const reduceMotion = useReducedMotion();
  const rotation = useMotionValue(0);
  const [pulseTag, setPulseTag] = useState("");

  useEffect(() => {
    rotation.set(0);
  }, [nodes.length, rotation]);

  const nodesByChapter = useMemo(() => {
    const m = new Map<number, MapNode[]>();
    for (const n of nodes) {
      const arr = m.get(n.chapterIndex) ?? [];
      arr.push(n);
      m.set(n.chapterIndex, arr);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    return m;
  }, [nodes]);

  const flyToChapter = useCallback((chapterIndex: number) => {
    document
      .getElementById(`reading-map-anchor-ch-${chapterIndex}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

    const cur =
      nodesByChapter.get(chapterIndex)?.find(
        (n) =>
          n.type === "current" ||
          (liveParagraphId &&
            liveParagraphId.length > 0 &&
            n.paragraphId === liveParagraphId),
      ) ?? nodesByChapter.get(chapterIndex)?.[0];
    const tag = cur?.id ?? `pulse-ch-${chapterIndex}`;
    setPulseTag(tag);
    window.setTimeout(() => setPulseTag(""), 2400);
  }, [nodesByChapter, liveParagraphId]);

  useEffect(() => {
    queueMicrotask(() => flyToChapter(currentChapterIndex));
  }, [currentChapterIndex, flyToChapter, chapters.length]);

  const twistDrag = useCallback(
    (
      _: MouseEvent | TouchEvent | PointerEvent,
      info: { delta: { x: number } },
    ) => {
      if (reduceMotion) return;
      rotation.set(rotation.get() - info.delta.x * 0.4);
    },
    [rotation, reduceMotion],
  );

  const twistDragEnd = useCallback(
    (
      _: MouseEvent | TouchEvent | PointerEvent,
      info: { velocity: { x: number } },
    ) => {
      if (reduceMotion) return;
      animate(rotation, rotation.get() - info.velocity.x * 0.082, {
        type: "spring",
        damping: 28,
        stiffness: 126,
        mass: 0.78,
      });
    },
    [rotation, reduceMotion],
  );

  const chCount = chapters.length;

  if (chCount === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">暂无章节</p>
    );
  }

  return (
    <>
      {/* 顶部云层 — 「未知」遮蔽 */}
      <div
        className="pointer-events-none sticky top-0 z-30 mx-auto mb-[-100px] h-[min(140px,_22dvh)] w-[min(calc(100vw-28px),400px)] -translate-y-14"
        style={{
          marginTop: -24,
          background:
            "linear-gradient(to bottom, color-mix(in oklch,#050507 95%,transparent) 52%, transparent 96%)",
          maskImage:
            "linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,.4) 70%,transparent 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        aria-hidden
      />

      <div className="relative pb-52 [perspective-origin:50%_40%]" style={{ perspective: "1180px" }}>
        <motion.div
          className="relative mx-auto w-full pb-44 pt-[0.95rem]"
          style={{
            touchAction: "pan-y pinch-zoom",
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div
            className="relative mx-auto flex max-w-[min(100vw-32px,_360px)] flex-col-reverse [transform-style:preserve-3d]"
            drag={reduceMotion ? false : "x"}
            dragElastic={0.038}
            dragMomentum={false}
            onDrag={twistDrag}
            onDragEnd={twistDragEnd}
            style={{
              rotateY: rotation,
              minHeight: SEGMENT_HEIGHT * chCount + 160,
              paddingBottom: 64,
              paddingTop: 20,
            }}
          >
            {chapters.map((ch, chi) => {
              const ahead = chi > currentChapterIndex;
              const blurPx = ahead
                ? Math.min(
                    8,
                    1 + Math.max(0, chi - currentChapterIndex - 1) * 2,
                  )
                : 0;
              const chNodes = nodesByChapter.get(chi) ?? [];
              const title = ch?.title ?? `第 ${chi + 1} 章`;

              return (
                <div
                  key={`seg-${chi}`}
                  id={`reading-map-anchor-ch-${chi}`}
                  className="relative shrink-0 scroll-mt-[clamp(260px,min(62dvh,520px),560px)] [transform-style:preserve-3d]"
                  style={{
                    height: SEGMENT_HEIGHT,
                    filter: ahead
                      ? `blur(${blurPx}px) saturate(0.62)`
                      : undefined,
                    opacity: ahead ? Math.max(0.34, 0.96 - blurPx * 0.048) : 1,
                  }}
                >
                  <div
                    className="pointer-events-none absolute bottom-[-18%] left-1/2 h-[138%] w-[32px] -translate-x-1/2 rounded-full bg-gradient-to-t from-transparent via-white/42 to-transparent shadow-[inset_0_0_18px_rgba(255,255,255,0.065)]"
                    style={{ opacity: ahead ? 0.17 : 0.5 }}
                  />

                  <p className="pointer-events-none absolute left-1/2 top-1 max-w-[16rem] -translate-x-1/2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {title}
                  </p>

                  <div className="absolute inset-x-8 top-[40%] h-0 [transform-style:preserve-3d]">
                    {chNodes.map((node, ni) => {
                      const nc = Math.max(1, chNodes.length);
                      const spiral =
                        chi * SPIRAL_STEP +
                        (stableHash(node.id + "∆") % 59) +
                        ni * (300 / nc);
                      const angleDeg = spiral % 360;
                      const dist =
                        ORBIT_Z +
                        (stableHash(node.id + "ρ") % 5) * 12;

                      const isStar =
                        node.type === "current" ||
                        (liveParagraphId &&
                          liveParagraphId.length > 0 &&
                          node.paragraphId === liveParagraphId);
                      const isPulseBurst = pulseTag === node.id;

                      return (
                        <motion.div
                          key={node.id}
                          className={cn(
                            "absolute [transform-style:preserve-3d]",
                            ahead ? "opacity-[0.65]" : "opacity-[0.95]",
                          )}
                          style={{
                            left: "50%",
                            top: "-30px",
                            width: "120px",
                            marginLeft: "-60px",
                            transform: `
                                  rotateY(${angleDeg}deg)
                                  translateZ(${dist}px)
                                  rotateY(${-angleDeg}deg)
                                `,
                          }}
                        >
                          <button
                            type="button"
                            className={cn(
                              "flex w-full flex-col items-center gap-1.5 rounded-[1.08rem] border border-transparent bg-black/[0.18] px-1.5 py-2.5 outline-none transition-colors",
                              !ahead &&
                                "hover:border-white/[0.1] hover:bg-white/[0.06]",
                              (isStar || isPulseBurst) &&
                                "ring-2 ring-[color-mix(in_oklch,var(--primary)_88%,transparent)] shadow-[0_0_44px_-2px_color-mix(in_oklch,var(--primary)_66%,transparent)]",
                            )}
                            onPointerDown={() => {
                              onNodePointerDown(node);
                            }}
                            onPointerUp={(e) => {
                              flyToChapter(chi);
                              e.preventDefault();
                              onTowerNodeReleased(node);
                            }}
                            onPointerCancel={onNodePointerInterrupt}
                            onPointerLeave={onNodePointerInterrupt}
                          >
                            <motion.span
                              className="flex flex-col items-center gap-1.5"
                              animate={
                                isStar && !reduceMotion
                                  ? {
                                      scale: [1, 1.07, 1],
                                      filter: [
                                        "drop-shadow(0 0 0 transparent)",
                                        "drop-shadow(0 0 10px color-mix(in oklch, var(--primary) 72%, transparent))",
                                        "drop-shadow(0 0 0 transparent)",
                                      ],
                                    }
                                  : isPulseBurst && !reduceMotion
                                    ? {
                                        scale: [1, 1.12, 1],
                                      }
                                    : {}
                              }
                              transition={
                                isStar
                                  ? {
                                      repeat: Infinity,
                                      duration: 3,
                                      ease: "easeInOut",
                                    }
                                  : { duration: 0.5 }
                              }
                            >
                              {orbIcon(node.type)}
                              <span className="line-clamp-2 max-w-[6rem] text-center font-sans text-[0.58rem] font-medium leading-snug text-zinc-200">
                                {node.payload.title ?? node.type}
                              </span>
                            </motion.span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  {ahead ? (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-[1.06rem] border border-white/[0.048] bg-gradient-to-br from-transparent via-black/54 to-transparent"
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </motion.div>

          <div
            className="pointer-events-none absolute inset-x-[10%] bottom-[8%] h-48 rounded-[100%] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_74%)] blur-[28px]"
            aria-hidden
          />
        </motion.div>

        <motion.div
          className="material-glass mx-auto mt-6 flex max-w-[min(100vw-24px,_406px)] items-center rounded-[1.08rem] border border-white/[0.09] px-4 py-2.5"
          drag={reduceMotion ? false : "x"}
          dragElastic={0}
          dragMomentum={false}
          onDrag={twistDrag}
          onDragEnd={twistDragEnd}
          style={{ touchAction: "none" }}
        >
          <p className="w-full text-center font-sans text-[0.63rem] leading-relaxed tracking-wide text-zinc-400">
            横向绕塔旋转 · 纵向翻动章节锚点 · 点就飞入
          </p>
        </motion.div>
      </div>
    </>
  );
}
