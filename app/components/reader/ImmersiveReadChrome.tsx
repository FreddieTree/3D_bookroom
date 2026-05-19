"use client";

import { Pause, Play } from "lucide-react";

import { useAppStore } from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";

type ImmersiveReadChromeProps = {
  chapterProgressPct: number;
  immersivePlaying: boolean;
  onTogglePlaying: () => void;
};

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function ImmersiveReadChrome({
  chapterProgressPct,
  immersivePlaying,
  onTogglePlaying,
}: ImmersiveReadChromeProps) {
  const readSpeed = useAppStore((s) => s.readerSettings.readSpeed);
  const setReaderSettings = useAppStore((s) => s.setReaderSettings);

  const cycleSpeed = () => {
    const i = SPEEDS.findIndex((s) => s === readSpeed);
    const next = SPEEDS[(i < 0 ? 1 : i + 1) % SPEEDS.length]!;
    setReaderSettings({ readSpeed: next });
  };

  const exit = () => setReaderSettings({ readingDisplayMode: "standard" });

  return (
    <div className="border-t border-border/70 bg-background/88 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${chapterProgressPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onTogglePlaying}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
          aria-label={immersivePlaying ? "暂停自动翻页" : "继续自动翻页"}
        >
          {immersivePlaying ? (
            <Pause className="size-5" fill="currentColor" />
          ) : (
            <Play className="size-5" fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          onClick={cycleSpeed}
          className={cn(
            "rounded-full border border-border px-3 py-2 text-[0.7rem] font-semibold tabular-nums text-foreground hover:bg-muted",
          )}
        >
          {readSpeed}x
        </button>
        <button
          type="button"
          onClick={exit}
          className="rounded-full px-3 py-2 text-[0.7rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          退出朗读
        </button>
      </div>
    </div>
  );
}
