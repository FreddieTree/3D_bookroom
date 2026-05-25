"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Map as MapIcon, MessagesSquare, Settings } from "lucide-react";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { AnimatedTitle } from "@/app/components/typography/AnimatedTitle";
import { RollingNumber } from "@/app/components/typography/RollingNumber";
import { cn } from "@/app/lib/utils";

type ReaderTopChromeProps = {
  bookId: string;
  chapterIndex: number;
  bookTitle: string;
  chapterTitle: string;
  progressPct: number;
  headerVisible: boolean;
  readingDisplayMode: "standard" | "immersive";
  /** Stronger backdrop blur while the pager is moving quickly */
  pagerBlurBoost: boolean;
  /** Hide chrome entirely (immersive mode or deep-reading focus). */
  deepReadingHidden: boolean;
  pendingQuestionsCount: number;
  onMap: () => void;
  onChat: () => void;
  onSettings: () => void;
  onReleasePending: () => void;
};

export function ReaderTopChrome({
  bookId,
  chapterIndex,
  bookTitle,
  chapterTitle,
  progressPct,
  headerVisible,
  pagerBlurBoost,
  deepReadingHidden,
  pendingQuestionsCount,
  onMap,
  onChat,
  onSettings,
  onReleasePending,
}: ReaderTopChromeProps) {
  const hideChrome = deepReadingHidden;
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.round(progressPct));

  const prevChapterRef = useRef(chapterIndex);
  const [chapterFlashKey, setChapterFlashKey] = useState(0);

  useEffect(() => {
    if (prevChapterRef.current !== chapterIndex) {
      prevChapterRef.current = chapterIndex;
      setChapterFlashKey((k) => k + 1);
    }
  }, [chapterIndex]);

  const titleVt: CSSProperties = {
    viewTransitionName: `book-title-${bookId}`,
    contain: "layout",
  };

  const chapterVt: CSSProperties = {
    viewTransitionName: `chapter-heading-${bookId}-${chapterIndex}`,
    contain: "layout",
  };

  const mapHubVt: CSSProperties = {
    viewTransitionName: `reading-map-hub-${bookId}`,
  };

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-[430px] select-none overflow-hidden pt-[env(safe-area-inset-top)] font-sans"
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
          "material-glass pointer-events-auto border-border/65 border-b transition-shadow",
          pagerBlurBoost && "material-glass-scroll",
          headerVisible && !hideChrome ? "shadow-[var(--shadow-soft)]" : "shadow-none",
        )}
      >
        <PageHeader
          sticky={false}
          elevated={Boolean(headerVisible && !hideChrome)}
          title={undefined}
          center={
            <span
              style={titleVt}
              className="line-clamp-1 text-center text-[0.8125rem] font-semibold text-foreground"
            >
              {bookTitle}
            </span>
          }
          right={
            <div className="flex shrink-0 items-center pr-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onMap()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-accent hover:bg-muted"
                  aria-label="阅读地图"
                  style={mapHubVt}
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
                onClick={() => onChat()}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="问 AI"
              >
                <MessagesSquare className="size-[1.15rem]" strokeWidth={1.75} />
              </button>
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
          <p
            className="font-serif text-[1rem] leading-snug text-muted-foreground"
            style={chapterVt}
          >
            {reduce ? (
              chapterTitle
            ) : (
              <AnimatedTitle
                key={`${bookId}-${chapterIndex}`}
                text={chapterTitle}
              />
            )}
          </p>
          <div className="relative mt-2 flex items-center gap-3">
            <div className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              {/* Chapter-change celebration wash */}
              {!reduce && chapterFlashKey > 0 ? (
                <motion.span
                  key={chapterFlashKey}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-primary/50 via-accent/65 to-primary/55"
                  initial={{ opacity: 0.95, scaleX: 0.06 }}
                  animate={{ opacity: 0, scaleX: 1 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "0% 50%" }}
                />
              ) : null}
              <div
                className={cn(
                  "relative z-[1] h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-200",
                  "shadow-[0_0_14px_-2px_color-mix(in_oklch,var(--color-primary)_72%,transparent),0_0_6px_-1px_color-mix(in_oklch,var(--color-accent)_45%,transparent)]",
                )}
                style={{
                  width: `${pct}%`,
                  boxShadow: pagerBlurBoost
                    ? `0 0 18px 0 color-mix(in oklch, var(--color-primary) 62%, transparent), 0 0 8px -1px color-mix(in oklch, var(--color-accent) 48%, transparent)`
                    : undefined,
                }}
              />
            </div>
            <span className="flex w-12 shrink-0 items-baseline justify-end font-sans text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
              {reduce ? (
                `${pct}%`
              ) : (
                <>
                  <RollingNumber value={pct} minDigits={1} />
                  <span>%</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
