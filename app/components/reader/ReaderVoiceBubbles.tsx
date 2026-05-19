"use client";

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
  const dragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -112 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-auto z-[52] mx-4 rounded-[1.25rem] border border-border/60 p-3 shadow-[var(--shadow-elevation-3)] backdrop-blur-xl"
          style={{
            perspective: 920,
            background:
              "color-mix(in oklch, var(--surface-1) 82%, transparent)",
          }}
          role="log"
          aria-live="polite"
        >
          <div className="space-y-3">
            <div className="flex justify-end">
              <motion.div
                className={cn(
                  "max-w-[92%] rounded-2xl rounded-br-md px-3.5 py-2.5 font-sans text-[0.9rem] leading-relaxed shadow-sm",
                  "bg-primary text-primary-foreground",
                )}
              >
                {userText}
              </motion.div>
            </div>
            <div className="flex justify-start">
              <motion.div
                className={cn(
                  "max-w-[92%] rounded-2xl rounded-bl-md px-3.5 py-2.5 font-sans text-[0.9rem] leading-relaxed shadow-sm",
                  "bg-[color-mix(in_oklch,var(--surface-2)_88%,transparent)] text-foreground",
                )}
              >
                {aiText}
                {aiStreaming ? (
                  <span className="ml-0.5 inline-block animate-pulse">▍</span>
                ) : null}
              </motion.div>
            </div>
            <p className="px-1 text-center font-sans text-[0.65rem] text-muted-foreground">
              左滑收起 · 点此区域外亦可关闭
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
