"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * TODO(成员3): 接入真实生成队列 / 进度；保留「过渡文案」插槽以无缝切换。
 */

type GenerationWaiterProps = {
  open: boolean;
  lines: string[];
  minMs?: number;
  onDone: () => void;
};

export function GenerationWaiter({
  open,
  lines,
  minMs = 2400,
  onDone,
}: GenerationWaiterProps) {
  const [idx, setIdx] = useState(0);
  const onDoneRef = useRef(onDone);

  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setIdx(0));
      return;
    }
    queueMicrotask(() => setIdx(0));
    const advance = window.setInterval(() => {
      setIdx((i) => (i + 1 < lines.length ? i + 1 : i));
    }, 820);
    const done = window.setTimeout(() => {
      window.clearInterval(advance);
      onDoneRef.current();
    }, minMs);
    return () => {
      window.clearInterval(advance);
      window.clearTimeout(done);
    };
  }, [open, lines, minMs]);

  if (!open) return null;

  const text = lines[Math.min(idx, Math.max(0, lines.length - 1))] ?? "…";

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <motion.div
        className="relative size-14 rounded-full border-2 border-primary/35 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.95, repeat: Infinity, ease: "linear" }}
      />
      <p className="min-h-[3.5rem] max-w-[18rem] text-center text-[0.9rem] leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
