import type { BookMeta } from "@/app/lib/data/books";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import { getRegisteredBookChapterContent } from "@/app/lib/reader/chapter-registry";
import type { BookReadingProgress } from "@/app/lib/stores/readerStore";

/**
 * 首页「继续阅读」等：书目默认进度与实际阅读快照取较大值，返回 [0,1]。
 */
export function effectiveReadingFraction(
  book: BookMeta,
  slice?: BookReadingProgress | null,
): number {
  let fromStore = 0;
  if (slice) {
    const reg = getRegisteredBookChapterContent(book.id);
    const chapters =
      reg && reg.length > 0 ? reg : getChaptersForBook(book.id);
    if (chapters && chapters.length > 0) {
      const chIdx = Math.min(
        Math.max(0, slice.chapterIndex ?? 0),
        chapters.length - 1,
      );
      const chapter = chapters[chIdx]!;
      let within = 0.35;
      if (slice.paragraphId) {
        const pi = chapter.paragraphs.findIndex((p) => p.id === slice.paragraphId);
        if (pi >= 0 && chapter.paragraphs.length > 1) {
          within = pi / (chapter.paragraphs.length - 1);
        }
      }
      fromStore = (chIdx + within) / chapters.length;
    } else if (book.totalChapters > 0 && slice?.chapterIndex != null) {
      /** 会话内尚未 hydrate 正文时，用书目里的章数粗略估计继续阅读卡片。 */
      const ci = Math.min(
        Math.max(0, slice.chapterIndex),
        Math.max(0, book.totalChapters - 1),
      );
      fromStore = (ci + 0.42) / book.totalChapters;
    } else if (slice.scrollOffset && slice.scrollOffset > 48) {
      /** 横向阅读将 `scrollOffset` 存成 scrollLeft — 仍可提示「有约定位」占位。 */
      fromStore = 0.045;
    }
  }
  return Math.min(1, Math.max(book.progress, fromStore));
}
