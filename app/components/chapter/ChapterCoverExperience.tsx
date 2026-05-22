"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedTitle } from "@/app/components/typography/AnimatedTitle";
import { getChapterCoverMeta } from "@/app/lib/mock/chapter-cover";
import { useViewTransitionNavigate } from "@/app/lib/hooks/useViewTransitionNavigate";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import type { MockAmbientHandle } from "@/app/lib/audio/mock-ambient";
import { safeVibrate } from "@/app/lib/utils/vibrate";

type ChapterCoverExperienceProps = {
  bookId: string;
  chapterIndex: number;
  /** Mongo / RSC 已解析章节标题时使用，优先级高于演示 JSON。 */
  chapterTitleFromDb?: string | null;
};

export function ChapterCoverExperience({
  bookId,
  chapterIndex,
  chapterTitleFromDb = null,
}: ChapterCoverExperienceProps) {
  const navigateVt = useViewTransitionNavigate();
  const meta = getChapterCoverMeta(bookId, chapterIndex, chapterTitleFromDb);
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
    navigateVt(
      `/book/${bookId}/read?chapter=${chapterIndex}&fromCover=1`,
      { scroll: false },
    );
  };

  const n = chapterIndex + 1;

  const chapterHeadingVt: CSSProperties = {
    viewTransitionName: `chapter-heading-${bookId}-${chapterIndex}`,
    contain: "layout",
  };

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-x-hidden bg-[#060608] text-zinc-50">
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: `radial-gradient(100% 80% at 50% 18%, color-mix(in oklch, var(--color-primary) 22%, transparent), transparent 55%), linear-gradient(180deg, #0a0a0f 0%, #050506 48%, #020203 100%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full min-w-0 max-w-[430px] flex-1 flex-col justify-center px-[max(1.25rem,env(safe-area-inset-left))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))]">
        <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-zinc-500">
          Chapter
        </p>
        <motion.p
          className="mt-4 text-center font-serif text-[clamp(3rem,18vw,4.25rem)] font-semibold leading-none tracking-tight text-zinc-100"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: leaving ? 0 : 1, y: leaving ? -16 : 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        >
          {n.toString().padStart(2, "0")}
        </motion.p>
        <div
          style={chapterHeadingVt}
          className="mt-10 text-center font-serif text-[1.35rem] font-semibold leading-snug text-zinc-200 sm:text-[1.5rem]"
        >
          <AnimatedTitle text={meta.chapterTitle} />
        </div>
        <motion.p
          className="mt-8 text-center font-serif text-[0.95rem] leading-relaxed text-zinc-400"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: leaving ? 0 : 1, y: leaving ? -8 : 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {meta.tagline}
        </motion.p>

        <div className="min-h-[min(4rem,8dvh)] flex-1 shrink" />

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
