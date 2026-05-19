"use client";

import { motion } from "framer-motion";
import { Map as MapIcon, Settings } from "lucide-react";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { cn } from "@/app/lib/utils";

type ReaderTopChromeProps = {
  bookTitle: string;
  chapterTitle: string;
  progressPct: number;
  headerVisible: boolean;
  readingDisplayMode: "standard" | "immersive";
  pendingQuestionsCount: number;
  onMap: () => void;
  onSettings: () => void;
  onReleasePending: () => void;
};

export function ReaderTopChrome({
  bookTitle,
  chapterTitle,
  progressPct,
  headerVisible,
  readingDisplayMode,
  pendingQuestionsCount,
  onMap,
  onSettings,
  onReleasePending,
}: ReaderTopChromeProps) {
  const hideChrome = readingDisplayMode === "immersive";

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-0 z-40 overflow-hidden font-sans"
      initial={false}
      animate={{
        y:
          hideChrome
            ? "-120%"
            : headerVisible
              ? 0
              : "-120%",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 36 }}
    >
      <div
        className={cn(
          "pointer-events-auto border-border/65 border-b backdrop-blur-md transition-shadow",
          headerVisible && !hideChrome
            ? "shadow-[var(--shadow-soft)]"
            : "shadow-none",
        )}
        style={{
          background:
            "color-mix(in oklch, var(--color-background) 88%, transparent)",
        }}
      >
        <PageHeader
          sticky={false}
          elevated={Boolean(headerVisible && !hideChrome)}
          title={undefined}
          center={
            <p className="line-clamp-1 text-center text-[0.8125rem] font-semibold text-foreground">
              {bookTitle}
            </p>
          }
          right={
            <div className="flex shrink-0 items-center pr-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onMap()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-accent hover:bg-muted"
                  aria-label="阅读地图"
                >
                  <MapIcon className="size-[1.2rem]" strokeWidth={1.75} />
                </button>
                {pendingQuestionsCount > 0 ? (
                  <button
                    type="button"
                    className="absolute -right-0.5 top-1 z-10 flex min-h-[1.35rem] min-w-[1.35rem] items-start justify-end rounded-md p-0"
                    aria-label="揭晓悬念"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReleasePending();
                    }}
                  >
                    <span className="reader-pending-breathe block h-2.5 w-2.5 rounded-full bg-destructive shadow-sm ring-2 ring-background" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onSettings()}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="阅读设置"
              >
                <Settings className="size-[1.15rem]" strokeWidth={1.75} />
              </button>
            </div>
          }
        />

        <div className="px-6 pb-3 pt-1">
          <p className="font-serif text-[1rem] leading-snug text-muted-foreground">
            {chapterTitle}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-[2px] min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.min(100, Math.round(progressPct))}%` }}
              />
            </div>
            <span className="w-11 shrink-0 text-right font-sans text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
              {Math.round(Math.min(100, progressPct))}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
