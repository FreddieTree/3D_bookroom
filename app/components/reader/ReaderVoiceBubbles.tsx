"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Sparkles } from "lucide-react";

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
          dragConstraints={{ left: -220, right: 0 }}
          onDragEnd={dragEnd}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -112 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
          className={cn(
            "pointer-events-auto z-[52] mx-4 rounded-[1.35rem] border border-border/40 p-[0.72rem]",
            "shadow-[var(--shadow-elevation-4)]",
          )}
          style={{
            background:
              "color-mix(in oklch, var(--surface-1) 92%, var(--color-background))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          role="log"
          aria-live="polite"
        >
          <div className="space-y-3">
            <div className="flex justify-end gap-2.5">
              <motion.div
                className="max-w-[90%]"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 31,
                }}
              >
                <div
                  className={cn(
                    "rounded-2xl rounded-br-md px-3.5 py-2.5 font-sans text-[0.9rem] leading-relaxed",
                    "bg-gradient-to-br from-primary via-primary to-brand-600 text-primary-foreground",
                    "shadow-[0_8px_28px_-14px_color-mix(in_oklch,var(--color-primary)_70%,transparent)]",
                  )}
                >
                  {userText}
                </div>
              </motion.div>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-[2rem] shrink-0 place-items-center rounded-full bg-primary",
                  "text-[10px] font-bold text-primary-foreground shadow-sm ring-2 ring-background/50",
                )}
              >
                我
              </span>
            </div>

            <div className="flex justify-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-[2rem] shrink-0 place-items-center rounded-full",
                  "bg-[var(--surface-2)] text-primary ring-2 ring-border/60",
                  aiStreaming && "animate-pulse",
                )}
              >
                <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
              </span>

              <motion.div
                className="relative max-w-[90%]"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
              >
                <AnimatePresence>
                  {goldBurst > 0 ? (
                    <motion.span
                      key={goldBurst}
                      aria-hidden
                      className="pointer-events-none absolute -inset-0.5 z-0 rounded-2xl bg-gradient-to-r from-amber-200/45 via-amber-300/35 to-primary/25"
                      initial={{ opacity: 0.55, scale: 0.96 }}
                      animate={{ opacity: 0, scale: 1.03 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                </AnimatePresence>

                <div
                  className={cn(
                    "relative z-[1] rounded-2xl rounded-bl-md px-3.5 py-2.5 font-sans text-[0.9rem] leading-relaxed",
                    "border border-border/80 bg-[var(--surface-1)] text-foreground",
                    "shadow-[0_6px_24px_-12px_oklch(0_0_0_/_0.18)]",
                    "dark:border-border/60 dark:bg-[var(--surface-2)]",
                  )}
                >
                  <span>{aiText}</span>
                  {aiStreaming ? <ThinkingCursor /> : null}
                </div>
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
