"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { GenerationWaiter } from "@/app/components/multimodal/GenerationWaiter";
import { useAppStore } from "@/app/lib/stores/appStore";
import type { Paragraph } from "@/app/lib/data/sample-content";
import { cn } from "@/app/lib/utils";
import { demoImageSkeletonMs } from "@/app/lib/env/demo";
import { safeVibrate } from "@/app/lib/utils/vibrate";

type ImageGenerationProps = {
  bookId: string;
  open: boolean;
  onClose: () => void;
  paragraph: Paragraph | null;
};

type Phase = "idle" | "wait" | "skeleton" | "pick";

const PALETTES = [
  { emoji: "🌹", from: "#7c2d12", to: "#f59e0b" },
  { emoji: "🦊", from: "#134e4a", to: "#5eead4" },
  { emoji: "✨", from: "#4c1d95", to: "#c4b5fd" },
  { emoji: "🪐", from: "#1e3a5f", to: "#93c5fd" },
  { emoji: "🐍", from: "#14532d", to: "#86efac" },
];

function waiterLines(para: Paragraph | null): string[] {
  if (!para) return ["为上文搭一座想象的桥…", "色彩在空白处聚集…", "马上呈现画面候选。"];
  const t = para.text.trim();
  const a = t.slice(0, 52) + (t.length > 52 ? "…" : "");
  const b = "把语气留在纸上，把光线留给画布。";
  const c = "正在为你生成专属画面…";
  return [a, b, c];
}

async function fetchArtStyle(bookId: string): Promise<string> {
  try {
    const res = await fetch(`/books/${bookId}/story_profile.json`);
    if (!res.ok) return "";
    const data = (await res.json()) as { art_style?: string };
    return data.art_style ?? "";
  } catch {
    return "";
  }
}

export function ImageGeneration({
  bookId,
  open,
  onClose,
  paragraph,
}: ImageGenerationProps) {
  const addParagraphVisual = useAppStore((s) => s.addParagraphVisual);
  const [phase, setPhase] = useState<Phase>("idle");
  const [candidates, setCandidates] = useState<
    { emoji: string; from: string; to: string }[]
  >([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const lines = useMemo(() => waiterLines(paragraph), [paragraph]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setPhase("idle");
        setCandidates([]);
        setGeneratedImageUrl(null);
      });
      return;
    }
    queueMicrotask(() => setPhase("wait"));
  }, [open, paragraph?.id]);

  const onWaiterDone = useCallback(async () => {
    if (!paragraph) return;
    setPhase("skeleton");

    const artStyle = await fetchArtStyle(bookId);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphText: paragraph.text, artStyle }),
      });
      const data = (await res.json()) as { imageUrl?: string; error?: string };
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setPhase("pick");
        return;
      }
    } catch {
      // fallback to mock below
    }

    // fallback: random palette
    window.setTimeout(() => {
      const pool = [...PALETTES].sort(() => Math.random() - 0.5).slice(0, 3);
      setCandidates(pool);
      setPhase("pick");
    }, demoImageSkeletonMs(520));
  }, [bookId, paragraph]);

  const pickReal = () => {
    if (!paragraph || !generatedImageUrl) return;
    safeVibrate(14);
    addParagraphVisual(bookId, paragraph.id, {
      emoji: "🖼",
      colorFrom: "#1e293b",
      colorTo: "#334155",
      imageUrl: generatedImageUrl,
    });
    onClose();
  };

  const pick = (c: (typeof candidates)[number]) => {
    if (!paragraph) return;
    safeVibrate(14);
    addParagraphVisual(bookId, paragraph.id, {
      emoji: c.emoji,
      colorFrom: c.from,
      colorTo: c.to,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && paragraph ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭"
            className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "108%" }}
            animate={{ y: 0 }}
            exit={{ y: "108%" }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="font-sans fixed bottom-0 left-1/2 z-[140] w-full max-w-[430px] -translate-x-1/2 rounded-t-2xl border border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">生成画面</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="关闭"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <p className="mb-4 line-clamp-2 text-[0.72rem] leading-relaxed text-muted-foreground">
              段落：{paragraph.text.slice(0, 120)}
              {paragraph.text.length > 120 ? "…" : ""}
            </p>

            {phase === "wait" ? (
              <GenerationWaiter
                open
                lines={lines}
                minMs={2500}
                onDone={onWaiterDone}
              />
            ) : null}

            {phase === "skeleton" ? (
              <div className="pb-6">
                <div className="mx-auto aspect-[3/4] w-48 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : null}

            {phase === "pick" && generatedImageUrl ? (
              <div className="pb-6">
                <div className="relative mx-auto overflow-hidden rounded-xl ring-1 ring-black/10" style={{ maxWidth: "192px" }}>
                  <img
                    src={generatedImageUrl}
                    alt="AI 生成插图"
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={pickReal}
                  className={cn(
                    "mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground",
                  )}
                >
                  使用此图
                </button>
              </div>
            ) : null}

            {phase === "pick" && !generatedImageUrl ? (
              <div className="grid grid-cols-3 gap-2 pb-6">
                {candidates.map((c) => (
                  <motion.button
                    key={c.emoji + c.from}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => pick(c)}
                    className={cn(
                      "relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/10",
                    )}
                    style={{
                      background: `linear-gradient(145deg, ${c.from}, ${c.to})`,
                    }}
                  >
                    <span className="text-3xl drop-shadow-md">{c.emoji}</span>
                    <span className="mt-2 text-[0.6rem] font-medium text-white/90">
                      选用
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
