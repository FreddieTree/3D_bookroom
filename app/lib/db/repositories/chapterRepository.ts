/**
 * Paragraph envelopes + chapter metadata accessors.
 */
import { Chapter } from "@/app/lib/db/models/chapters";

/** Load one chapter deterministically (`bookId` + ordinal). */
export async function getChapterByBookAndIndex(bookId: string, index: number) {
  return Chapter.findOne({ bookId, index }).lean().exec();
}

/** Convenience fetch for spoilers + batch pipelines. */
export async function listChaptersByBook(bookId: string) {
  return Chapter.find({ bookId }).sort({ index: 1 }).lean().exec();
}

/** 正文章节序列（阅读器 / API chapters）：排除前言后记，顺序按 bodyIndex。 */
export async function listBodyChaptersByBook(bookId: string) {
  const rows = await Chapter.find({ bookId }).sort({ index: 1 }).lean().exec();
  const body = rows.filter((r) => {
    const kind =
      typeof (r as { chapterType?: string }).chapterType === "string"
        ? (r as { chapterType?: string }).chapterType
        : "body";
    return kind === "body";
  });
  body.sort((a, b) => {
    const ai = (a as { bodyIndex?: number | null }).bodyIndex;
    const bi = (b as { bodyIndex?: number | null }).bodyIndex;
    if (
      ai != null &&
      bi != null &&
      Number.isFinite(ai) &&
      Number.isFinite(bi) &&
      ai !== bi
    ) {
      return ai - bi;
    }
    return a.index - b.index;
  });
  return body;
}
