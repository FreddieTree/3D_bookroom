"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { safeVibrate } from "@/app/lib/utils/vibrate";
import { cn } from "@/app/lib/utils";

export function MultiDeviceSyncSection({ className }: { className?: string }) {
  const [toast, setToast] = useState<string | null>(null);

  const sync = () => {
    safeVibrate(12);
    setToast("已排队同步（演示）…");
    window.setTimeout(() => setToast("同步完成 · 全部为本地 Mock"), 900);
    window.setTimeout(() => setToast(null), 3800);
  };

  return (
    <section
      aria-label="多设备同步"
      className={cn(
        "mb-10 overflow-hidden rounded-3xl border border-border bg-muted/[0.08] px-6 py-[1.375rem]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground">
            多设备同步
          </h2>
          <p className="font-serif mt-1 text-sm leading-relaxed text-muted-foreground">
            占位能力：书签与精读笔记即将对接云端队列。
          </p>
          <p className="font-sans mt-2 rounded-xl bg-background/72 px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border/65">
            上次同步：5 分钟前
          </p>
        </div>
        <button
          type="button"
          onClick={sync}
          className="font-sans h-11 shrink-0 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98]"
        >
          立即同步
        </button>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.slice(0, 12)}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="font-sans mt-4 rounded-2xl border border-primary/35 bg-primary/8 px-3 py-2 text-center text-xs font-medium text-foreground"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
