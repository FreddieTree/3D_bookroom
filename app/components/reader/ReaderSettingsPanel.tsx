"use client";

import { startTransition, useEffect, useState } from "react";

import {
  type ReaderSettings,
  type ReaderThemeMode,
  useAppStore,
} from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";

const VOICES = [
  { id: "ceramic", label: "青瓷" },
  { id: "ink", label: "松烟" },
  { id: "amber", label: "琥珀" },
] as const;

const READ_SPEEDS = [0.5, 1, 1.5, 2] as const;

type ReaderSettingsPanelProps = {
  fontSizeOptions: readonly number[];
  /** draft: edits buffer until Apply; immediate: each control writes store */
  persistMode: "draft" | "immediate";
  /** When draft + dismissed */
  onRequestClose?: () => void;
};

export function ReaderSettingsPanel({
  fontSizeOptions,
  persistMode,
  onRequestClose,
}: ReaderSettingsPanelProps) {
  const storeSettings = useAppStore((s) => s.readerSettings);
  const setReaderSettings = useAppStore((s) => s.setReaderSettings);

  const [draft, setDraft] = useState(storeSettings);

  useEffect(() => {
    startTransition(() => setDraft(storeSettings));
  }, [storeSettings]);

  const applyAll = () => {
    setReaderSettings(draft);
    onRequestClose?.();
  };

  const closeOnly = () => {
    setDraft(storeSettings);
    onRequestClose?.();
  };

  const mutate = (patch: Partial<ReaderSettings>) => {
    if (persistMode === "immediate") {
      setReaderSettings(patch);
    } else {
      setDraft((d) => ({ ...d, ...patch }));
    }
  };

  const resolved = persistMode === "immediate" ? storeSettings : draft;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-6">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            朗读模式
          </p>
          <div className="flex flex-col gap-2">
            {(
              [
                ["standard", "标准阅读"],
                ["immersive", "AI 沉浸朗读"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() =>
                  mutate({
                    readingDisplayMode: v,
                  })
                }
                className={cn(
                  "rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                  resolved.readingDisplayMode === v
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            朗读倍速
          </p>
          <div className="flex flex-wrap gap-2">
            {READ_SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => mutate({ readSpeed: s })}
                className={cn(
                  "h-9 min-w-[2.75rem] rounded-lg px-2 text-xs font-semibold tabular-nums",
                  resolved.readSpeed === s
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
                  mutate({ fontSize: n as ReaderSettings["fontSize"] })
                }
                className={cn(
                  "h-9 min-w-[2.25rem] rounded-lg px-2 text-xs font-semibold",
                  resolved.fontSize === n
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
            value={resolved.brightness}
            onChange={(e) =>
              mutate({ brightness: Number.parseFloat(e.target.value) })
            }
            className="w-full accent-primary"
          />
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            主题
          </p>
          <div className="flex gap-2 rounded-xl border border-border p-1">
            {(
              [
                ["light", "明亮"],
                ["dark", "暗黑"],
                ["system", "跟随"],
              ] as [ReaderThemeMode, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => mutate({ theme: v })}
                className={cn(
                  "flex-1 rounded-lg py-2 text-center text-[0.6875rem] font-semibold",
                  resolved.theme === v
                    ? "bg-muted text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted/60",
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
              checked={resolved.bgmEnabled}
              onChange={(e) => mutate({ bgmEnabled: e.target.checked })}
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
                onClick={() => mutate({ voiceProfile: v.id })}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left text-sm",
                  resolved.voiceProfile === v.id
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

      {persistMode === "draft" ? (
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
      ) : null}
    </>
  );
}
