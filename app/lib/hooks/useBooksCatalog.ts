"use client";

import { useEffect, useState } from "react";

import type { BookMeta } from "@/app/lib/data/books";
import { USE_REAL_DB } from "@/app/lib/data-source";

/**
 * 书单：mock 兜底；`NEXT_PUBLIC_USE_REAL_DB=true` 时用 `/api/books`（仅 public + isReady）。
 */
export function useBooksCatalog(initial: BookMeta[]): BookMeta[] {
  const [catalog, setCatalog] = useState<BookMeta[]>(() => initial);

  useEffect(() => {
    if (!USE_REAL_DB) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/books", { credentials: "include" });
        if (!res.ok) return;

        const body = (await res.json()) as { data?: BookMeta[] };
        const rows = body.data?.filter((b) => b && typeof b.id === "string");
        if (cancelled || !rows?.length) return;

        setCatalog(rows);
      } catch {
        /* fall back keeps `initial` */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
