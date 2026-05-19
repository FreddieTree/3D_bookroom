/**
 * Dense reading cursor per user/title pair (`readingprogresses` Mongoose plural).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const readingProgressSchema = new Schema(
  {
    /** Owning user id (`users.userId`). */
    userId: { type: String, required: true, index: true, trim: true },
    /** Book canonical id. */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Active chapter index as defined in `chapters.index`. */
    chapterIndex: { type: Number, required: true, default: 0, min: 0 },
    /** Current paragraph fingerprint within chapter (`paragraphs[].id`). */
    paragraphId: { type: String, required: true },
    /** Monotonic optimistic locking token for multiplayer sync merges. */
    syncVersion: { type: Number, required: true, default: 1, min: 1 },
    /** Last device emitting an update (`users.devices[].deviceId`). */
    deviceId: { type: String, trim: true },
    /** Percent complete heuristic cached for bookshelf rendering (0-100). */
    percentComplete: { type: Number, min: 0, max: 100 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

readingProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });

export type ReadingProgress = InferSchemaType<typeof readingProgressSchema>;

export const ReadingProgress: Model<ReadingProgress> =
  (mongoose.models.ReadingProgress as Model<ReadingProgress> | undefined) ??
  mongoose.model<ReadingProgress>("ReadingProgress", readingProgressSchema);
