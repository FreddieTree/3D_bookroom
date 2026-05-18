"use client";

import { useAppStore } from "@/app/lib/stores/appStore";

export function SettingsStoreCard() {
  const currentBookId = useAppStore((s) => s.currentBookId);
  const currentChapterIndex = useAppStore((s) => s.currentChapterIndex);
  const currentParagraphId = useAppStore((s) => s.currentParagraphId);
  const readerSettings = useAppStore((s) => s.readerSettings);
  const readerProgressByBook = useAppStore((s) => s.readerProgressByBook);

  return (
    <section
      className="font-sans mt-10 space-y-3 rounded-2xl border border-border bg-muted/40 p-5"
      aria-label="本地阅读状态（localStorage）"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Store 预览
      </p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">currentBookId</dt>
          <dd className="font-mono text-right text-foreground">
            {currentBookId ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">currentChapterIndex</dt>
          <dd className="font-mono text-right text-foreground">
            {currentChapterIndex}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">currentParagraphId</dt>
          <dd className="font-mono text-right text-foreground">
            {currentParagraphId ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">reader theme</dt>
          <dd className="text-right text-foreground">{readerSettings.theme}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">font / brightness</dt>
          <dd className="text-right text-foreground">
            {readerSettings.fontSize}px · {readerSettings.brightness.toFixed(2)}×
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">per-book progress keys</dt>
          <dd className="font-mono text-right text-xs text-foreground">
            {Object.keys(readerProgressByBook).length
              ? Object.keys(readerProgressByBook).join(", ")
              : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
