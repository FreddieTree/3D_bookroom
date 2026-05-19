/**
 * Spoiler graph reads for teammate 2 RAG overlays.
 */
import { SpoilerMap } from "@/app/lib/db/models/spoilerMaps";

/** Latest spoiler graph version descending. */
export async function getLatestSpoilerMap(bookId: string) {
  return SpoilerMap.findOne({ bookId }).sort({ version: -1 }).lean().exec();
}

/** Historical audit trail exports. */
export async function listSpoilerMaps(bookId: string) {
  return SpoilerMap.find({ bookId }).sort({ version: -1 }).lean().exec();
}
