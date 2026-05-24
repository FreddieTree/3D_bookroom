"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Trash2 } from "lucide-react";

import type { ParagraphVisual } from "@/app/lib/stores/appStore";
import { useAppStore } from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";

type ParagraphVisualAlbumProps = {
  bookId: string;
  paragraphId: string;
  visuals: ParagraphVisual[];
  expanded: boolean;
  onToggleExpanded: () => void;
};

const LONG_MS = 480;

export function ParagraphVisualAlbum({
  bookId,
  paragraphId,
  visuals,
  expanded,
  onToggleExpanded,
}: ParagraphVisualAlbumProps) {
  const removeParagraphVisual = useAppStore((s) => s.removeParagraphVisual);
  const [fullscreen, setFullscreen] = useState<ParagraphVisual | null>(null);
  const [sheet, setSheet] = useState<ParagraphVisual | null>(null);
  const holdTimer = useRef<number | null>(null);
  const holdFired = useRef(false);

  if (visuals.length === 0) return null;

  const clearHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const onThumbDown = (v: ParagraphVisual) => {
    holdFired.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdFired.current = true;
      holdTimer.current = null;
      safeVibrate(10);
      setSheet(v);
    }, LONG_MS);
  };

  const onThumbUp = (v: ParagraphVisual) => {
    clearHold();
    if (!holdFired.current) {
      setFullscreen(v);
    }
    holdFired.current = false;
  };

  return (
    <div className="font-sans mt-2 space-y-2">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex items-center gap-1.5 text-left text-[0.68rem] font-medium text-muted-foreground hover:text-foreground"
      >
        <Camera className="size-3.5" strokeWidth={1.75} />
        <span>
          {visuals.length} 张画面
          <span className="ml-1 text-[0.6rem] opacity-70">
            {expanded ? "（收起）" : "（展开）"}
          </span>
        </span>
      </button>

      {expanded ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visuals.map((v) => (
            <button
              key={v.id}
              type="button"
              onPointerDown={() => onThumbDown(v)}
              onPointerUp={() => onThumbUp(v)}
              onPointerCancel={clearHold}
              className={cn(
                "relative h-20 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/15",
              )}
              style={v.imageUrl ? undefined : {
                background: `linear-gradient(140deg, ${v.colorFrom}, ${v.colorTo})`,
              }}
            >
              {v.imageUrl ? (
                <img src={v.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow">
                  {v.emoji}
                </span>
              )}
            </button>
          ))}
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setFullscreen(visuals[visuals.length - 1]!)}
          className="flex h-12 w-16 overflow-hidden rounded-lg ring-1 ring-border"
          style={visuals[visuals.length - 1]!.imageUrl ? undefined : {
            background: `linear-gradient(140deg, ${visuals[visuals.length - 1]!.colorFrom}, ${visuals[visuals.length - 1]!.colorTo})`,
          }}
          aria-label="预览画面"
        >
          {visuals[visuals.length - 1]!.imageUrl ? (
            <img src={visuals[visuals.length - 1]!.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="m-auto text-2xl drop-shadow">
              {visuals[visuals.length - 1]!.emoji}
            </span>
          )}
        </button>
      )}

      {fullscreen ? (
        <button
          type="button"
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/85 p-6"
          aria-label="关闭全屏"
          onClick={() => setFullscreen(null)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="aspect-square w-full max-w-[min(100vw-3rem,22rem)] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
            style={fullscreen.imageUrl ? undefined : {
              background: `linear-gradient(145deg, ${fullscreen.colorFrom}, ${fullscreen.colorTo})`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreen.imageUrl ? (
              <img src={fullscreen.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-7xl drop-shadow-lg">
                {fullscreen.emoji}
              </span>
            )}
          </motion.div>
        </button>
      ) : null}

      {sheet ? (
        <div className="fixed inset-0 z-[195] flex flex-col justify-end bg-black/45">
          <button
            type="button"
            className="flex-1"
            aria-label="关闭菜单"
            onClick={() => setSheet(null)}
          />
          <div className="rounded-t-2xl border border-border bg-background p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                setSheet(null);
                setFullscreen(sheet);
              }}
            >
              全屏查看
            </button>
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-destructive hover:bg-muted"
              onClick={() => {
                removeParagraphVisual(bookId, paragraphId, sheet.id);
                setSheet(null);
              }}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              删除此图
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
