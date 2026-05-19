"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Sparkles } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { haptics, safeVibrate } from "@/app/lib/utils/vibrate";

type ReaderFloatingMicProps = {
  processing: boolean;
  deepFocusGhost?: boolean;
  hasCompletedBubble?: boolean;
  onRoundBegin?: () => void;
  onCommitSend?: () => void;
  className?: string;
};

function MockVolumeBars({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-6 bottom-[1.125rem] top-9 z-[2] flex items-end justify-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="h-7 w-[3px] max-h-[74%] min-h-[38%] origin-bottom rounded-full bg-white/93"
          animate={{
            scaleY: [0.44, 0.98, 0.52, 0.86],
          }}
          transition={{
            duration: 0.68 + i * 0.04,
            repeat: Infinity,
            ease: [0.22, 1, 0.36, 1],
            delay: i * 0.09,
          }}
        />
      ))}
    </div>
  );
}

export function ReaderFloatingMic({
  processing,
  deepFocusGhost = false,
  hasCompletedBubble = false,
  onRoundBegin,
  onCommitSend,
  className,
}: ReaderFloatingMicProps) {
  const HOLD_MS = 200;
  const [recording, setRecording] = useState(false);
  const [cancelSwipe, setCancelSwipe] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const holdTimer = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const tickTimer = useRef<number | null>(null);
  const recordStartedAt = useRef<number | null>(null);

  const idleBreath =
    !recording && !processing && !deepFocusGhost;

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const stopTick = () => {
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  };

  useEffect(() => () => stopTick(), []);

  const beginRecording = () => {
    haptics.longPressStart();
    recordStartedAt.current = Date.now();
    setRecording(true);
    setCancelSwipe(false);
    setRecordingMs(0);
    stopTick();
    tickTimer.current = window.setInterval(() => {
      const t0 = recordStartedAt.current;
      if (!t0) return;
      setRecordingMs(Date.now() - t0);
    }, 140);
    onRoundBegin?.();
  };

  const endRecording = () => {
    stopTick();
    setRecording(false);
    recordStartedAt.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (processing || e.button !== 0) return;
    clearHold();
    startRef.current = { x: e.clientX, y: e.clientY };
    holdTimer.current = window.setTimeout(beginRecording, HOLD_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = startRef.current;
    if (!s || processing) return;
    const dy = e.clientY - s.y;
    if (recording && dy < -56) setCancelSwipe(true);
    else setCancelSwipe(false);
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y) > 14;
    if (!recording && moved) clearHold();
  };

  const onPointerEnd = () => {
    clearHold();
    startRef.current = null;
    if (!recording) return;
    if (cancelSwipe) {
      safeVibrate(8);
      endRecording();
      return;
    }
    endRecording();
    onCommitSend?.();
  };

  return (
    <div className={cn("pointer-events-none flex flex-col items-center", className)}>
      {recording || processing ? (
        <p className="pointer-events-auto mb-2 max-w-[14rem] text-center font-sans text-[0.7rem] font-medium text-muted-foreground">
          {processing ? (
            "AI 在想…"
          ) : recording ? (
            <>
              {(recordingMs / 1000).toFixed(1)}s ·{" "}
              <span className={cancelSwipe ? "text-destructive" : undefined}>
                {cancelSwipe ? "松开取消录音" : "上滑取消 · 松开发送"}
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="relative flex size-[4.5rem] shrink-0 items-center justify-center">
        {recording
          ? [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-500"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 1.8,
                  delay: i * 0.6,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))
          : null}

        <motion.span
          className="pointer-events-none absolute inset-[-10px] rounded-full blur-xl"
          style={{
            background: recording
              ? "radial-gradient(circle at 50% 50%, rgb(239 68 68 / 0.5), transparent 68%)"
              : processing
                ? "radial-gradient(circle at 50% 50%, rgb(234 179 8 / 0.42), transparent 68%)"
                : "radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--color-primary) 48%, transparent), transparent 70%)",
          }}
          animate={{
            opacity: recording || processing ? 0.94 : deepFocusGhost ? 0.28 : 0.76,
          }}
        />

        <motion.button
          type="button"
          aria-label={
            processing ? "处理中…" : recording ? "录音中，松开发送" : "长按发问"
          }
          disabled={processing}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className={cn(
            "pointer-events-auto relative z-[6] rounded-full outline-none ring-2 ring-transparent",
            hasCompletedBubble &&
              !recording &&
              !processing &&
              "ring-amber-400/68 dark:ring-amber-400/58",
          )}
          animate={{
            scale: idleBreath ? [1, 1.06, 1] : recording ? 1.15 : 1,
          }}
          transition={
            idleBreath
              ? { repeat: Infinity, duration: 4, ease: "easeInOut" }
              : { type: "spring", stiffness: 440, damping: 32 }
          }
          style={{
            opacity:
              deepFocusGhost && !recording && !processing ? 0.45 : undefined,
          }}
          whileTap={{
            scale: processing ? 1 : recording ? 1.06 : deepFocusGhost ? 0.95 : 0.97,
          }}
        >
          <span
            className={cn(
              "relative grid size-[4.5rem] place-items-center overflow-hidden rounded-full text-primary-foreground shadow-[var(--shadow-ambient-2)]",
              recording &&
                "bg-gradient-to-br from-red-500 via-red-600 to-orange-950",
              processing &&
                "bg-gradient-to-br from-amber-400 via-amber-700 to-orange-950",
              !recording &&
                !processing &&
                "bg-gradient-to-br from-primary via-[color-mix(in_oklch,var(--color-primary)_88%,var(--color-background))] to-brand-600",
            )}
            style={{
              boxShadow: "inset 0 2px 0 oklch(1 0 0 / 0.16)",
            }}
          >
            <MockVolumeBars active={recording} />

            <motion.span
              className="relative z-[7] grid place-items-center text-white drop-shadow-[0_1px_2px_rgb(0_0_0_/_38%)]"
              animate={{
                rotate: processing ? [0, 360] : 0,
              }}
              transition={{
                rotate: processing
                  ? { duration: 4.8, repeat: Infinity, ease: "linear" }
                  : {},
              }}
            >
              {recording ? (
                <motion.span
                  animate={{
                    opacity: [0.88, 1, 0.78],
                  }}
                  transition={{ repeat: Infinity, duration: 0.92 }}
                >
                  <Mic className="size-[1.875rem]" strokeWidth={2} aria-hidden />
                </motion.span>
              ) : processing ? (
                <Sparkles className="size-[1.875rem]" strokeWidth={2} aria-hidden />
              ) : (
                <Mic className="size-[1.875rem]" strokeWidth={2} aria-hidden />
              )}
            </motion.span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
