"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { Loader2, Mic } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";

type ReaderFloatingMicProps = {
  processing: boolean;
  onRoundBegin?: () => void;
  onCommitSend?: () => void;
  className?: string;
};

export function ReaderFloatingMic({
  processing,
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

  const scaleBreath = useMotionValue(1);

  useEffect(() => {
    let cancelled = false;
    async function breathe() {
      while (!cancelled && !recording && !processing) {
        await animate(scaleBreath, 1.05, {
          duration: 1.5,
          ease: "easeInOut",
        });
        await animate(scaleBreath, 1, {
          duration: 1.5,
          ease: "easeInOut",
        });
      }
    }
    if (!recording && !processing) {
      void breathe();
    }
    return () => {
      cancelled = true;
    };
  }, [recording, processing, scaleBreath]);

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
    safeVibrate(15);
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

      <div className="relative flex items-center justify-center">
        {recording &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inline-block size-[4.25rem] rounded-full bg-destructive/35",
              )}
              initial={{ opacity: 0.55, scale: 1 }}
              animate={{
                opacity: [0.5, 0],
                scale: [1, 2.08],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.9,
                delay: i * 0.43,
                ease: "easeOut",
              }}
            />
          ))}
        <motion.button
          type="button"
          aria-label={
            processing
              ? "处理中…"
              : recording
                ? "录音中，松开发送"
                : "长按发问"
          }
          disabled={processing}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className={cn(
            "pointer-events-auto relative grid size-[4.25rem] place-items-center rounded-full outline-none ring-1 ring-black/10 cursor-pointer",
            processing &&
              "bg-amber-500 text-white shadow-[0_0_28px_-6px_rgb(251_191_36_/_58%)] dark:bg-amber-600",
            !processing &&
              recording &&
              "bg-destructive text-destructive-foreground shadow-[0_18px_40px_-10px_rgb(239_68_68_/_55%)]",
            !processing &&
              !recording &&
              "bg-primary text-primary-foreground shadow-[0_18px_40px_-10px_color-mix(in_oklch,var(--color-primary)_52%,transparent)]",
          )}
          style={{
            scale: recording ? 1.1 : processing ? 1 : scaleBreath,
          }}
        >
          {recording ? (
            <Mic className="size-8 shrink-0" strokeWidth={2} />
          ) : processing ? (
            <Loader2 className="size-9 shrink-0 animate-spin" strokeWidth={1.85} />
          ) : (
            <Mic className="size-8 shrink-0" strokeWidth={2} />
          )}
        </motion.button>
      </div>
    </div>
  );
}
