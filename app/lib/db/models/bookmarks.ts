/**
 * Reader highlights / saved beats (`bookmarks`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const bookmarkSchema = new Schema(
  {
    /** Owner user id. */
    userId: { type: String, required: true, index: true, trim: true },
    /** Book canonical id. */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Paragraph pointer within narrative. */
    paragraphId: { type: String, required: true, trim: true },
    /** Optional reader annotation. */
    note: { type: String, trim: true },
    /** Optional excerpt snapshot for offline previews. */
    excerpt: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

bookmarkSchema.index({ userId: 1, bookId: 1, paragraphId: 1 }, { unique: true });

export type Bookmark = InferSchemaType<typeof bookmarkSchema>;

export const Bookmark: Model<Bookmark> =
  (mongoose.models.Bookmark as Model<Bookmark> | undefined) ??
  mongoose.model<Bookmark>("Bookmark", bookmarkSchema);
