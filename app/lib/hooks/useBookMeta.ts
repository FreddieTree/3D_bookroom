"use client";

import { useEffect, useMemo, useState } from "react";

import type { BookMeta } from "@/app/lib/data/books";
import { getBookById } from "@/app/lib/data/books";
import { USE_REAL_DB } from "@/app/lib/data-source";

/** 书单 / 映射等：REAL_DB 时拉 GET /api/books/:id（已映射 BookMeta）；否则仅用静态书目。 */
export function useBookMeta(bookId: string): BookMeta | undefined {
  const staticMeta = useMemo(() => getBookById(bookId), [bookId]);
  const [remoteMeta, setRemoteMeta] = useState<{
    bookId: string;
    meta: BookMeta;
  } | null>(null);

  useEffect(() => {
    if (!USE_REAL_DB) return;

    let cancelled = false;

    void (async () => {
      const id = bookId;
      try {
        const res = await fetch(`/api/books/${encodeURIComponent(id)}`, {
          credentials: "include",
        });
        const body = (await res.json()) as { data?: BookMeta };
        if (cancelled || !body.data?.id || body.data.id !== id) return;
        setRemoteMeta({ bookId: id, meta: body.data });
      } catch {
        if (!cancelled) {
          const fallback = getBookById(id);
          if (fallback) setRemoteMeta({ bookId: id, meta: fallback });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  if (!USE_REAL_DB) return staticMeta;

  return remoteMeta?.bookId === bookId ? remoteMeta.meta : staticMeta;
}
