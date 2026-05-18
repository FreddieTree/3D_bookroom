"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { getChapterCoverMeta } from "@/app/lib/mock/chapter-cover";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import type { MockAmbientHandle } from "@/app/lib/audio/mock-ambient";
import { safeVibrate } from "@/app/lib/utils/vibrate";

type ChapterCoverExperienceProps = {
  bookId: string;
  chapterIndex: number;
};

export function ChapterCoverExperience({
  bookId,
  chapterIndex,
}: ChapterCoverExperienceProps) {
  const router = useRouter();
  const meta = getChapterCoverMeta(bookId, chapterIndex);
  const ambientRef = useRef<MockAmbientHandle | null>(null);
  const startedRef = useRef(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const startAmbient = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      await resumeAudioContext();
      ambientRef.current?.stop();
      ambientRef.current = startMockAmbient({
        durationCapMs: 30_000,
        gain: 0.065,
      });
      queueMicrotask(() => setNeedsUnlock(false));
    } catch {
      queueMicrotask(() => {
        setNeedsUnlock(true);
        startedRef.current = false;
      });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void startAmbient();
    });
    return () => {
      ambientRef.current?.stop();
    };
  }, [startAmbient]);

  const goRead = () => {
    if (leaving) return;
    safeVibrate(12);
    ambientRef.current?.stop();
    setLeaving(true);
    window.setTimeout(() => {
      router.push(
        `/book/${bookId}/read?chapter=${chapterIndex}&fromCover=1`,
      );
    }, 480);
  };

  if (!meta) return null;

  const n = chapterIndex + 1;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#060608] text-zinc-50">
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: `radial-gradient(100% 80% at 50% 18%, color-mix(in oklch, var(--color-primary) 22%, transparent), transparent 55%), linear-gradient(180deg, #0a0a0f 0%, #050506 48%, #020203 100%)`,
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">
          Chapter
        </p>
        <motion.p
          className="mt-4 text-center font-serif text-[4.25rem] font-semibold leading-none tracking-tight text-zinc-100"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: leaving ? 0 : 1, y: leaving ? -16 : 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        >
          {n.toString().padStart(2, "0")}
        </motion.p>
        <motion.h1
          className="mt-10 text-center font-serif text-[1.35rem] font-semibold leading-snug text-zinc-200 sm:text-[1.5rem]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: leaving ? 0 : 1, y: leaving ? -12 : 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.06 }}
        >
          {meta.chapterTitle}
        </motion.h1>
        <motion.p
          className="mt-8 text-center font-serif text-[0.95rem] leading-relaxed text-zinc-400"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: leaving ? 0 : 1, y: leaving ? -8 : 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {meta.tagline}
        </motion.p>

        <div className="flex-1" />

        <AnimatePresence>
          {needsUnlock ? (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => void startAmbient()}
              className="mb-6 w-full rounded-2xl border border-white/12 bg-white/5 py-3 text-center text-xs text-zinc-300 backdrop-blur-sm"
            >
              轻触以开启配乐（系统限制需手势解锁）
            </motion.button>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={goRead}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-2xl bg-primary py-4 text-center text-sm font-semibold text-primary-foreground shadow-[0_14px_40px_-18px_var(--color-primary)]"
        >
          开始阅读
        </motion.button>
      </div>
    </div>
  );
}
