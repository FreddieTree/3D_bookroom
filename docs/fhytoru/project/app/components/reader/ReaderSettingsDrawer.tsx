"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/app/lib/utils";
import {
  type ReaderSettings,
  type ReaderThemeMode,
  useAppStore,
} from "@/app/lib/stores/appStore";

const VOICES = [
  { id: "ceramic", label: "青瓷" },
  { id: "ink", label: "松烟" },
  { id: "amber", label: "琥珀" },
] as const;

type ReaderSettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  fontSizeOptions: readonly number[];
};

export function ReaderSettingsDrawer({
  open,
  onClose,
  fontSizeOptions,
}: ReaderSettingsDrawerProps) {
  const storeSettings = useAppStore((s) => s.readerSettings);
  const setReaderSettings = useAppStore((s) => s.setReaderSettings);

  const [draft, setDraft] = useState(storeSettings);

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      setDraft(storeSettings);
    });
  }, [open, storeSettings]);

  const applyAll = () => {
    setReaderSettings(draft);
    onClose();
  };

  const closeOnly = () => {
    setDraft(storeSettings);
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭设置"
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnly}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring" as const, stiffness: 380, damping: 34 }}
            className="font-sans fixed bottom-0 right-0 top-0 z-[80] flex w-[min(100vw,20rem)] flex-col border-l border-border bg-background shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <span className="text-sm font-semibold text-foreground">阅读设置</span>
              <button
                type="button"
                onClick={closeOnly}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="关闭"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  朗读模式
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        readingDisplayMode: "standard",
                      }))
                    }
                    className={cn(
                      "rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                      draft.readingDisplayMode === "standard"
                        ? "bg-muted text-foreground ring-1 ring-border"
                        : "text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    标准阅读
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        readingDisplayMode: "immersive",
                      }))
                    }
                    className={cn(
                      "rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                      draft.readingDisplayMode === "immersive"
                        ? "bg-muted text-foreground ring-1 ring-border"
                        : "text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    AI 沉浸朗读
                  </button>
                </div>
              </section>

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  沉浸朗读 · 倍速
                </p>
                <div className="flex flex-wrap gap-2">
                  {([0.75, 1, 1.25, 1.5] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          readSpeed: s,
                        }))
                      }
                      className={cn(
                        "h-9 min-w-[2.75rem] rounded-lg px-2 text-xs font-semibold tabular-nums",
                        draft.readSpeed === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  字号
                </p>
                <div className="flex flex-wrap gap-2">
                  {fontSizeOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          fontSize: n as ReaderSettings["fontSize"],
                        }))
                      }
                      className={cn(
                        "h-9 min-w-[2.25rem] rounded-lg px-2 text-xs font-semibold",
                        draft.fontSize === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  亮度
                </p>
                <input
                  type="range"
                  min={0.65}
                  max={1.15}
                  step={0.05}
                  value={draft.brightness}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      brightness: Number.parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
              </section>

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  主题
                </p>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ["light", "明亮"],
                      ["dark", "暗黑"],
                      ["system", "跟随系统"],
                    ] as [ReaderThemeMode, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, theme: v }))}
                      className={cn(
                        "rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                        draft.theme === v
                          ? "bg-muted text-foreground ring-1 ring-border"
                          : "text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-3">
                  <span className="text-sm font-medium text-foreground">BGM</span>
                  <input
                    type="checkbox"
                    checked={draft.bgmEnabled}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, bgmEnabled: e.target.checked }))
                    }
                    className="size-4 accent-primary"
                  />
                </label>
              </section>

              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  AI 朗读音色
                </p>
                <div className="space-y-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({ ...d, voiceProfile: v.id }))
                      }
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-left text-sm",
                        draft.voiceProfile === v.id
                          ? "bg-muted font-semibold text-foreground ring-1 ring-border"
                          : "text-muted-foreground hover:bg-muted/70",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={closeOnly}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={applyAll}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
              >
                应用
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
