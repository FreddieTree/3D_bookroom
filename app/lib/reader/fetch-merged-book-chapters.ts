"use client";

import type { ChapterContent } from "@/app/lib/data/sample-content";
import { getChaptersForBook } from "@/app/lib/data/sample-content";

import { registerBookChapterContent } from "@/app/lib/reader/chapter-registry";

/** 单次拉取进行中，防止阅读器 / 地图等重复并行请求同一本书。 */
const inflightByBookId = new Map<string, Promise<ChapterContent[]>>();

/**
 * 优先 `/api/books/:id/chapters`（Mongo），为空或失败时再回落到本地 `sample-content`。
 */
export async function fetchMergedBookChapters(
  bookId: string,
): Promise<ChapterContent[]> {
  if (typeof window === "undefined") return getChaptersForBook(bookId) ?? [];

  const existing = inflightByBookId.get(bookId);
  if (existing) return existing;

  const job = (async () => {
    let fromDb: ChapterContent[] = [];

    try {
      const encoded = encodeURIComponent(bookId);
      const res = await fetch(`/api/books/${encoded}/chapters`, {
        credentials: "include",
      });
      if (res.ok) {
        const body = (await res.json()) as {
          data?: ChapterContent[];
        };
        const raw = body.data;
        fromDb =
          Array.isArray(raw) && raw.length > 0
            ? (raw.filter(
                (c) =>
                  c &&
                  typeof c.bookId === "string" &&
                  typeof c.title === "string" &&
                  Array.isArray(c.paragraphs),
              ) as ChapterContent[])
            : [];
      }
    } catch {
      // ignore → sample fallback below
    }

    const sampleFallback = getChaptersForBook(bookId);
    const merged = fromDb.length > 0 ? fromDb : (sampleFallback ?? []);

    registerBookChapterContent(bookId, merged);
    return merged;
  })().finally(() => {
    inflightByBookId.delete(bookId);
  });

  inflightByBookId.set(bookId, job);
  return job;
}
