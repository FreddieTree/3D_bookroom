/**
 * Lookup chapter-level generated stems (loops, sfx, narration takes).
 */
import { ChapterAsset } from "@/app/lib/db/models/chapterAssets";

export async function listAssetsForChapter(bookId: string, chapterIndex: number) {
  return ChapterAsset.find({ bookId, chapterIndex }).sort({ assetSlot: 1 }).lean().exec();
}

export async function listAssetsForBook(bookId: string) {
  return ChapterAsset.find({ bookId }).sort({ chapterIndex: 1 }).lean().exec();
}
