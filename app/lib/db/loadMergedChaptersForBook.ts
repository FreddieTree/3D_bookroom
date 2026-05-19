import "server-only";

import { connectDB } from "@/app/lib/db/mongodb";
import { listChaptersByBook } from "@/app/lib/db/repositories/chapterRepository";
import type { ChapterContent } from "@/app/lib/data/sample-content";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import { normalizeDbChapterDocs } from "@/app/lib/reader/normalize-db-chapters";

/** 服务端：Mongo 优先，无数据则沿用本地演示章节。用于 RSC TOC、章节扉页等。 */
export async function loadMergedChaptersForBook(
  bookId: string,
): Promise<ChapterContent[]> {
  try {
    await connectDB();
    const rows = await listChaptersByBook(bookId);
    if (rows.length > 0) {
      return normalizeDbChapterDocs(rows as never[]);
    }
  } catch {
    // DB 不可用（本地无 Mongo 等）→ 仅用样例
  }
  return getChaptersForBook(bookId) ?? [];
}
