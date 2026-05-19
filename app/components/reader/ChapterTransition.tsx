"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

type ChapterTransitionProps = {
  direction: number;
  children: ReactNode;
};

/**
 * 章节切换：单侧折页进出（preserve-3d + 渐变纸边）。
 */
export function ChapterTransition({ direction, children }: ChapterTransitionProps) {
  const d = direction >= 0 ? 1 : -1;

  return (
    <div className="perspective-mid preserve-3d relative flex min-h-0 flex-1 flex-col">
      <motion.div
        initial={{ rotateY: d > 0 ? 82 : -82, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={{ rotateY: d > 0 ? -82 : 82, opacity: 0 }}
        transition={{ duration: 0.55, ease }}
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: d > 0 ? "left center" : "right center",
        }}
        className="preserve-3d relative flex min-h-0 flex-1 flex-col backface-hidden"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-none opacity-95"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, oklch(0 0 0 / 0.22), transparent 18%, transparent 82%, oklch(0 0 0 / 0.18))",
          }}
        />
        {children}
      </motion.div>
    </div>
  );
}
