import {
  computeReadProgressPercentFromChapters,
  getChaptersForBook,
} from "@/app/lib/data/sample-content";
import type { ChapterContent } from "@/app/lib/data/sample-content";
import { getRegisteredBookChapterContent } from "@/app/lib/reader/chapter-registry";

/** 会话内缓存正文（阅读器 hydrate）优先，其次样例正文。 */
export function resolveChaptersForProgress(
  bookId: string,
  override?: ChapterContent[] | null,
): ChapterContent[] | null {
  if (override && override.length > 0) return override;
  const reg = getRegisteredBookChapterContent(bookId);
  if (reg && reg.length > 0) return reg;
  return getChaptersForBook(bookId);
}

/** 全书进度百分比：Mongo / 会话缓存 / 演示 JSON 任一可用即可算出。 */
export function computeReadProgressPercentFlexible(
  bookId: string,
  progress: { chapterIndex: number; paragraphId: string | null } | undefined,
  overrideChapters?: ChapterContent[] | null,
): number {
  const chs =
    resolveChaptersForProgress(bookId, overrideChapters) ??
    ([] as ChapterContent[]);
  return computeReadProgressPercentFromChapters(chs, progress);
}
