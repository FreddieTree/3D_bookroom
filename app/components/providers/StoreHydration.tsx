"use client";

import { useEffect, type ReactNode } from "react";

import { useAppStore } from "@/app/lib/stores/appStore";
import { useReaderStore } from "@/app/lib/stores/readerStore";

/**
 * Ensures zustand persist rehydrates on the client after SSR (avoids stale default snapshot flash).
 * Migrates deprecated `readerProgressByBook` from the app LS bundle into `readerStore` once both are ready.
 */
export function StoreHydration({ children }: { children: ReactNode }) {
  useEffect(() => {
    async function run() {
      await Promise.all([
        useReaderStore.persist.rehydrate(),
        useAppStore.persist.rehydrate(),
      ]);

      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("sanweishuwu-app");
        if (!raw) return;
        const doc = JSON.parse(raw) as {
          state?: {
            readerProgressByBook?: Record<
              string,
              { chapterIndex: number; paragraphId: string | null }
            >;
            currentBookId?: string | null;
          };
        };
        const st = doc.state;
        useReaderStore.getState().migrateFromLegacyBundle({
          readerProgressByBook: st?.readerProgressByBook,
          currentBookId: st?.currentBookId ?? null,
        });
      } catch {
        /* ignore */
      }
    }
    void run();
  }, []);

  return children;
}
