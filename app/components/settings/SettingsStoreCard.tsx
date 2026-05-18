"use client";

import { useAppStore } from "@/app/lib/stores/appStore";

export function SettingsStoreCard() {
  const currentBookId = useAppStore((s) => s.currentBookId);
  const currentChapterIndex = useAppStore((s) => s.currentChapterIndex);
  const currentParagraphId = useAppStore((s) => s.currentParagraphId);

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
      </dl>
    </section>
  );
}
