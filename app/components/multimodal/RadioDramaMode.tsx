"use client";

/**
 * TODO(成员3): 接入 TTS / 分轨对白；保留角色条与播放状态机接口。
 * Mock：Web Audio 轻提示音 + 角色轮换高亮。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, X } from "lucide-react";

import type { Paragraph } from "@/app/lib/data/sample-content";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import { cn } from "@/app/lib/utils";

type RadioRole = { id: string; label: string; emoji: string };

const ROLES: RadioRole[] = [
  { id: "r1", label: "叙述者", emoji: "🎧" },
  { id: "r2", label: "小王子", emoji: "🤴" },
  { id: "r3", label: "玫瑰", emoji: "🌹" },
];

type RadioDramaModeProps = {
  open: boolean;
  onClose: () => void;
  paragraph: Paragraph | null;
};

export function RadioDramaMode({ open, onClose, paragraph }: RadioDramaModeProps) {
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(0);
  const cueRef = useRef<ReturnType<typeof startMockAmbient> | null>(null);
  const tickRef = useRef<number | null>(null);

  const stopCue = useCallback(() => {
    cueRef.current?.stop();
    cueRef.current = null;
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopCue();
      queueMicrotask(() => {
        setPlaying(false);
        setLine(0);
      });
    }
  }, [open, stopCue]);

  const playOneCue = useCallback(async () => {
    await resumeAudioContext();
    stopCue();
    const h = startMockAmbient({ durationCapMs: 900, gain: 0.045 });
    cueRef.current = h;
  }, [stopCue]);

  const togglePlay = async () => {
    if (!open) return;
    await resumeAudioContext();
    if (playing) {
      stopCue();
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setLine(0);
    await playOneCue();
    tickRef.current = window.setInterval(() => {
      setLine((l) => (l + 1) % ROLES.length);
      void playOneCue();
    }, 3200);
  };

  useEffect(
    () => () => {
      stopCue();
    },
    [stopCue],
  );

  return (
    <AnimatePresence>
      {open && paragraph ? (
        <>
          <motion.div
            className="fixed inset-0 z-[150] bg-black/72 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="font-sans fixed inset-x-0 bottom-0 z-[160] mx-auto w-full max-w-[430px] rounded-t-2xl border border-white/10 bg-[#0e0e12]/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-zinc-100 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.65)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">广播剧 · 体验</p>
              <button
                type="button"
                onClick={() => {
                  stopCue();
                  setPlaying(false);
                  onClose();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="退出"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>

            <p className="mb-4 line-clamp-4 text-[0.85rem] leading-relaxed text-zinc-300">
              {paragraph.text}
            </p>

            <div className="mb-4 flex justify-between gap-2 px-1">
              {ROLES.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex flex-1 flex-col items-center rounded-xl px-1 py-2 transition-all",
                    playing && line === i
                      ? "scale-105 bg-white/12 ring-1 ring-amber-400/50"
                      : "bg-white/[0.04] opacity-70",
                  )}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="mt-1 text-[0.65rem] text-zinc-400">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                aria-label={playing ? "暂停" : "播放"}
              >
                {playing ? (
                  <Pause className="size-5" fill="currentColor" />
                ) : (
                  <Play className="size-5" fill="currentColor" />
                )}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
