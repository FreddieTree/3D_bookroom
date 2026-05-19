/** Reader highlights / excerpts. */

import { Bookmark } from "@/app/lib/db/models/bookmarks";

export async function listBookmarks(userId: string, bookId: string | undefined) {
  return Bookmark.find({
    userId,
    ...(bookId ? { bookId } : {}),
  })
    .sort({ updatedAt: -1 })
    .lean()
    .exec();
}
