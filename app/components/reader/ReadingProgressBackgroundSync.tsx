"use client";

import { useEffect, useRef } from "react";

import {
  computeReadProgressPercentFromChapters,
} from "@/app/lib/data/sample-content";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { resolveChaptersForProgress } from "@/app/lib/utils/read-progress-percent";
import { useReaderStore } from "@/app/lib/stores/readerStore";

const DEBOUNCE_MS = Number(
  process.env.NEXT_PUBLIC_PROGRESS_SYNC_DEBOUNCE_MS ?? 9000,
);

function syncEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BACKGROUND_PROGRESS_SYNC === "true";
}

/** Debounced + `sendBeacon` 刷新：不向主线程的阅读滚动添阻塞。 */
export function ReadingProgressBackgroundSync({
  bookId,
}: {
  bookId: string;
}) {
  const progress = useReaderStore((s) => s.progressByBook[bookId]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBeaconMs = useRef<number>(0);

  useEffect(() => {
    if (!syncEnabled() || typeof window === "undefined") return;

    const ch = progress?.chapterIndex;
    const p = progress?.paragraphId;
    const chapters = resolveChaptersForProgress(bookId, null);
    if (!chapters?.length || p == null || ch == null) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const percent = computeReadProgressPercentFromChapters(chapters, {
        chapterIndex: ch,
        paragraphId: p,
      });
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEFAULT_DEMO_USER_ID,
          bookId,
          chapterIndex: ch,
          paragraphId: p,
          percentComplete: percent,
          mode: "update",
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [bookId, progress]);

  useEffect(() => {
    if (!syncEnabled() || typeof window === "undefined") return;

    const flushBeacon = () => {
      const now = performance.now();
      if (now - lastBeaconMs.current < 3500) return;
      lastBeaconMs.current = now;

      const chapters = resolveChaptersForProgress(bookId, null);
      if (!chapters?.length) return;

      const snap = useReaderStore.getState().progressByBook[bookId];
      if (!snap?.paragraphId) return;

      const percent = computeReadProgressPercentFromChapters(chapters, snap);
      const payload = JSON.stringify({
        userId: DEFAULT_DEMO_USER_ID,
        bookId,
        chapterIndex: snap.chapterIndex,
        paragraphId: snap.paragraphId,
        percentComplete: percent,
        mode: "update",
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/progress",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        void fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    };

    const ctrl = new AbortController();
    window.addEventListener("pagehide", flushBeacon, { signal: ctrl.signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") flushBeacon();
      },
      { signal: ctrl.signal },
    );

    return () => ctrl.abort();
  }, [bookId]);

  return null;
}
