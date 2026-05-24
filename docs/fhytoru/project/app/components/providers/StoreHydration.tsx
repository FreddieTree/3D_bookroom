"use client";

import { useEffect, type ReactNode } from "react";

import { useAppStore } from "@/app/lib/stores/appStore";

/**
 * Ensures zustand persist rehydrates on the client after SSR (avoids stale default snapshot flash).
 */
export function StoreHydration({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  return children;
}
