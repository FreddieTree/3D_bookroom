"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Pause, Play } from "lucide-react";

import { getChapterCoverMeta } from "@/app/lib/mock/chapter-cover";
import { resumeAudioContext, startMockAmbient } from "@/app/lib/audio/mock-ambient";
import type { MockAmbientHandle } from "@/app/lib/audio/mock-ambient";
import { useAppStore } from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";

type ReaderBgmStripProps = {
  bookId: string;
  chapterIndex: number;
};

export function ReaderBgmStrip({ bookId, chapterIndex }: ReaderBgmStripProps) {
  const bgmEnabled = useAppStore((s) => s.readerSettings.bgmEnabled);
  const collapsed = useAppStore((s) => s.readerBgmBarCollapsed);
  const setCollapsed = useAppStore((s) => s.setReaderBgmBarCollapsed);

  const [playing, setPlaying] = useState(false);
  const handleRef = useRef<MockAmbientHandle | null>(null);

  const meta = getChapterCoverMeta(bookId, chapterIndex);
  const label = meta?.bgmTitle ?? "章节氛围";

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    queueMicrotask(() => setPlaying(false));
  };

  useEffect(() => {
    stop();
  }, [bookId, chapterIndex]);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  if (!bgmEnabled) return null;

  const togglePlay = async () => {
    await resumeAudioContext();
    if (playing) {
      stop();
      return;
    }
    if (meta?.bgmUrl) {
      const audio = new Audio(meta.bgmUrl);
      audio.loop = true;
      audio.volume = 0.4;
      try {
        await audio.play();
      } catch (e) {
        console.warn("[ReaderBgmStrip] real bgm play failed, fallback to mock:", e);
        handleRef.current = startMockAmbient({ durationCapMs: 120_000, gain: 0.05 });
        setPlaying(true);
        return;
      }
      handleRef.current = {
        stop: () => {
          audio.pause();
          audio.src = "";
        },
        fadeOutAndStop: (durationMs: number) => {
          const start = audio.volume;
          const steps = 20;
          let i = 0;
          const id = window.setInterval(() => {
            i += 1;
            audio.volume = Math.max(0, start * (1 - i / steps));
            if (i >= steps) {
              window.clearInterval(id);
              audio.pause();
              audio.src = "";
            }
          }, durationMs / steps);
        },
      };
      setPlaying(true);
      return;
    }
    const h = startMockAmbient({ durationCapMs: 120_000, gain: 0.05 });
    handleRef.current = h;
    setPlaying(true);
  };

  return (
    <div
      className={cn(
        "border-b border-border/60 bg-background/55 px-3 backdrop-blur-md transition-[padding] duration-200",
        collapsed ? "py-1" : "py-1.5",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label={collapsed ? "展开 BGM" : "折叠 BGM"}
        >
          {collapsed ? (
            <ChevronUp className="size-4" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="size-4" strokeWidth={1.75} />
          )}
        </button>
        {!collapsed ? (
          <>
            <p className="min-w-0 flex-1 truncate text-[0.7rem] text-muted-foreground">
              <span className="font-medium text-foreground/90">BGM</span> ·{" "}
              {label}
            </p>
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80"
              aria-label={playing ? "暂停" : "播放"}
            >
              {playing ? (
                <Pause className="size-4" fill="currentColor" />
              ) : (
                <Play className="size-4" fill="currentColor" />
              )}
            </button>
          </>
        ) : (
          <motion.div
            className="h-1 flex-1 rounded-full bg-muted"
            initial={false}
            animate={{ opacity: playing ? 1 : 0.35 }}
          >
            {playing ? (
              <motion.div
                className="h-full rounded-full bg-primary/70"
                initial={{ width: "12%" }}
                animate={{ width: ["12%", "88%", "12%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );
}
