"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";

import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";

type ReaderVoiceBubblesProps = {
  open: boolean;
  userText: string;
  aiText: string;
  aiStreaming?: boolean;
  onDismissSwipe: () => void;
};

export function ReaderVoiceBubbles({
  open,
  userText,
  aiText,
  aiStreaming,
  onDismissSwipe,
}: ReaderVoiceBubblesProps) {
  const wasStreamingRef = useRef(false);
  const [goldBurst, setGoldBurst] = useState(0);

  useEffect(() => {
    if (!open) {
      wasStreamingRef.current = false;
      return;
    }
    const streaming = Boolean(aiStreaming);
    if (
      wasStreamingRef.current &&
      !streaming &&
      aiText.length > 0
    ) {
      setGoldBurst((n) => n + 1);
    }
    wasStreamingRef.current = streaming;
  }, [aiStreaming, aiText.length, open]);

  const dragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.x < -52 || info.velocity.x < -320) {
      safeVibrate(8);
      onDismissSwipe();
    }
  };

  return (
    <AnimatePresence mode="sync">
      {open ? (
        <motion.div
          drag="x"
          dragElastic={0.18}
          dragConstraints={{ left: -220, right: 96 }}
          onDragEnd={dragEnd}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -112 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
          className="pointer-events-auto z-[52] mx-4 rounded-[1.35rem] border border-white/14 p-[0.72rem] shadow-[var(--shadow-elevation-4)]"
          style={{
            perspective: 1080,
            background:
              "color-mix(in oklch, var(--surface-1) 78%, transparent)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          role="log"
          aria-live="polite"
        >
          <div className="perspective-mid preserve-3d space-y-3">
            {/* User */}
            <div className="flex justify-end gap-2.5">
              <motion.div
                className="preserve-3d max-w-[90%]"
                initial={{ opacity: 0.02, y: 18, rotateX: 14, rotateY: -8 }}
                animate={{ opacity: 1, y: 0, rotateX: 4, rotateY: -5 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 31,
                }}
                style={{
                  perspective: 940,
                  transformStyle: "preserve-3d",
                }}
              >
                <motion.div
                  layout
                  className={cn(
                    "rounded-2xl rounded-br-md px-3.5 py-2.5 font-sans text-[0.9rem] leading-relaxed",
                    "bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground",
                    "shadow-[0_10px_38px_-16px_color-mix(in_oklch,var(--color-primary)_82%,transparent),inset_0_1px_0_oklch(1_0_0_/_14%)]",
                  )}
                  animate={{ rotateY: [-5, -3.8, -4.8] }}
                  transition={{
                    repeat: Infinity,
                    duration: 5.8,
                    ease: "easeInOut",
                  }}
                >
                  {userText}
                </motion.div>
              </motion.div>
              <motion.span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-[2rem] shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent shadow-md ring-2 ring-background/42",
                  "text-[10px] font-bold text-white",
                )}
                animate={{ rotateY: [0, -8, 0], scale: [1, 1.04, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 8,
                  ease: "easeInOut",
                }}
              >
                我
              </motion.span>
            </div>

            {/* AI */}
            <div className="flex justify-start gap-2.5">
              <motion.span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-[2rem] shrink-0 place-items-center rounded-full bg-white/22 text-[11px] font-semibold uppercase tracking-[0.05em]",
                  "text-slate-100 ring-2 ring-white/38 dark:bg-black/52",
                  aiStreaming ? "" : "opacity-[0.86]",
                )}
                animate={
                  aiStreaming
                    ? { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }
                    : { opacity: [0.9, 0.98], scale: [1, 1.02, 1] }
                }
                transition={
                  aiStreaming
                    ? { repeat: Infinity, duration: 1.08, ease: "easeInOut" }
                    : { duration: 0.52, repeat: 0 }
                }
              >
                ai
              </motion.span>

              <motion.div
                className="preserve-3d relative max-w-[90%]"
                initial={{ opacity: 0, y: 18, rotateX: 14, rotateY: 7 }}
                animate={{ opacity: 1, y: 6, rotateX: 8, rotateY: 4 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                style={{ perspective: 920, transformStyle: "preserve-3d" }}
              >
                {/* Gold shimmer when streaming finishes */}
                <AnimatePresence>
                  {goldBurst > 0 ? (
                    <motion.span
                      key={goldBurst}
                      aria-hidden
                      className="pointer-events-none absolute -inset-1 z-0 rounded-2xl bg-gradient-to-r from-amber-300/82 via-accent/92 to-primary/66 mix-blend-screen"
                      initial={{ opacity: 0.92, scale: 0.92 }}
                      animate={{ opacity: 0, scale: 1.06 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                </AnimatePresence>

                <motion.div
                  layout
                  className={cn(
                    "relative z-[1] rounded-2xl rounded-bl-md px-3.5 py-2.5 font-sans text-[0.9rem] leading-relaxed backdrop-blur-sm",
                    "border border-white/26 bg-[color-mix(in_oklch,var(--surface-2)_84%,transparent)] text-foreground",
                    "shadow-[inset_0_1px_0_oklch(1_0_0_/_08%),0_14px_40px_-18px_oklch(0_0_0_/_0.45)] dark:border-white/10",
                  )}
                  animate={{
                    rotateY:
                      aiStreaming && aiText.length === 0
                        ? [-2.4, -1.8, -2]
                        : [3.8, 2.6, 3.8],
                  }}
                  transition={
                    aiStreaming && aiText.length === 0
                      ? {
                          repeat: Infinity,
                          duration: 3.15,
                          ease: "easeInOut",
                        }
                      : { duration: 0.45, repeat: 0 }
                  }
                >
                  <span>{aiText}</span>
                  {aiStreaming ? <ThinkingCursor /> : null}
                </motion.div>
              </motion.div>
            </div>

            <p className="px-1 pb-1 text-center font-sans text-[0.65rem] text-muted-foreground">
              左滑收起 · 划到区域外亦可关闭
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ThinkingCursor() {
  return (
    <span className="ml-1 inline-flex items-center gap-[2px] align-middle font-mono leading-none">
      <motion.span
        className="block h-[0.76em] w-px rounded-full bg-foreground"
        animate={{ opacity: [0.18, 1, 0.18], scaleY: [0.7, 1, 0.7] }}
        transition={{
          repeat: Infinity,
          duration: 0.94,
          ease: "easeInOut",
          delay: 0,
        }}
      />
      <motion.span
        className="block h-[0.76em] w-px rounded-full bg-muted-foreground/65"
        animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.76, 1.05, 0.76] }}
        transition={{
          repeat: Infinity,
          duration: 0.88,
          ease: "easeInOut",
          delay: 0.12,
        }}
      />
      <motion.span
        className="block h-[0.76em] w-px rounded-full bg-muted-foreground/50"
        animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.7, 1.02, 0.7] }}
        transition={{
          repeat: Infinity,
          duration: 0.9,
          ease: "easeInOut",
          delay: 0.24,
        }}
      />
    </span>
  );
}
