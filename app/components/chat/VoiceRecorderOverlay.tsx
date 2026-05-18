"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const MAX_MS = 30_000;
const CANCEL_DELTA = 72;

type VoiceRecorderOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Mock 语音结果，不做真实 ASR */
  onSend: (mockTranscript: string) => void;
};

export function VoiceRecorderOverlay({
  open,
  onClose,
  onSend,
}: VoiceRecorderOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const propsRef = useRef({ onSend, onClose });

  useLayoutEffect(() => {
    propsRef.current = { onSend, onClose };
  }, [onSend, onClose]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  useEffect(() => {
    if (!open) {
      stopLoop();
      return;
    }
    startRef.current = performance.now();
    queueMicrotask(() => {
      setElapsed(0);
      setCancelling(false);
    });
    const tick = () => {
      const t = performance.now() - startRef.current;
      setElapsed(Math.min(t, MAX_MS));
      if (t >= MAX_MS) {
        stopLoop();
        propsRef.current.onSend(mockTranscript());
        propsRef.current.onClose();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => stopLoop();
  }, [open, stopLoop]);

  const onPointerMove = (e: React.PointerEvent) => {
    const s = pointerStartRef.current;
    if (!s || !open) return;
    if (s.y - e.clientY > CANCEL_DELTA) setCancelling(true);
    else setCancelling(false);
  };

  const onPointerUp = () => {
    pointerStartRef.current = null;
    if (!open) return;
    if (cancelling) {
      propsRef.current.onClose();
      return;
    }
    propsRef.current.onSend(mockTranscript());
    propsRef.current.onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      className="font-sans fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        pointerStartRef.current = null;
        setCancelling(false);
      }}
    >
      <div className="absolute top-[max(2rem,env(safe-area-inset-top))] text-center text-sm text-muted-foreground">
        上滑取消 · 松开发送（mock）
      </div>
      <div
        className="flex flex-col items-center gap-8 px-8"
        onPointerDown={(e) => {
          pointerStartRef.current = { x: e.clientX, y: e.clientY };
        }}
      >
        <Waveform phase={elapsed / 200} cancelling={cancelling} />
        <p className="tabular-nums text-2xl font-semibold text-foreground">
          {(elapsed / 1000).toFixed(1)}s
        </p>
        <p className={cancelling ? "text-destructive" : "text-muted-foreground"}>
          {cancelling ? "将取消录音" : "录音中…"}
        </p>
      </div>
    </motion.div>
  );
}

function mockTranscript(): string {
  return "这段话是在说什么？能帮我联系小王子和玫瑰说说吗？";
}

function Waveform({ phase, cancelling }: { phase: number; cancelling: boolean }) {
  const bars = 24;
  return (
    <svg
      width={280}
      height={100}
      viewBox="0 0 280 100"
      className="text-primary"
      aria-hidden
    >
      {Array.from({ length: bars }, (_, i) => {
        const x = (i / bars) * 260 + 10;
        const amp =
          (Math.sin(i * 0.45 + phase) * 0.5 + 0.5) *
          (cancelling ? 12 : 28) +
          8;
        return (
          <rect
            key={i}
            x={x}
            y={50 - amp / 2}
            width={3}
            height={amp}
            rx={1.5}
            fill="currentColor"
            opacity={0.35 + (i % 5) * 0.08}
          />
        );
      })}
    </svg>
  );
}
