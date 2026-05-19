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
