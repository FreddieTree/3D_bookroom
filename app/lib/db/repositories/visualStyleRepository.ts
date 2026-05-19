/**
 * Visual bible retrieval for multimodal teammate 3.
 */
import { VisualStyle } from "@/app/lib/db/models/visualStyles";

/** Active palettes per book slug. */
export async function listActiveStylesForBook(bookId: string) {
  return VisualStyle.find({ bookId, isActive: true }).lean().exec();
}
