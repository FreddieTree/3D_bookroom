"use client";

import { useEffect, useState } from "react";

import type { BookMeta } from "@/app/lib/data/books";
import { getBookById } from "@/app/lib/data/books";
import { USE_REAL_DB } from "@/app/lib/data-source";

/** 书单 / 映射等：REAL_DB 时拉 GET /api/books/:id（已映射 BookMeta）；否则仅用静态书目。 */
export function useBookMeta(bookId: string): BookMeta | undefined {
  const [meta, setMeta] = useState<BookMeta | undefined>(() => getBookById(bookId));

  useEffect(() => {
    if (!USE_REAL_DB) {
      setMeta(getBookById(bookId));
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/books/${encodeURIComponent(bookId)}`, {
          credentials: "include",
        });
        const body = (await res.json()) as { data?: BookMeta };
        if (cancelled || !body.data?.id) return;
        setMeta(body.data);
      } catch {
        if (!cancelled) setMeta(getBookById(bookId));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return meta;
}
