/**
 * Derivative multimodal stems per chapter (`chapterassets`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ASSET_SLOTS = ["hero", "ambience_loop", "sfx_kit", "narration_take"] as const;

const chapterAssetSchema = new Schema(
  {
    /** Parent book canonical id matching `books.bookId`. */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Matches `chapters.index` for join queries. */
    chapterIndex: { type: Number, required: true, min: 0 },
    /** High-level taxonomy for ingestion routing. */
    assetSlot: { type: String, required: true, enum: ASSET_SLOTS },
    /** Resolved CDN/asset URL consumable by client readers. */
    assetUrl: { type: String, required: true, trim: true },
    /** Codec / duration / bitrate metadata for QA tooling. */
    technicalMeta: {
      mimeType: { type: String, trim: true },
      durationSec: { type: Number },
      bitrateKbps: { type: Number },
    },
    /** Model + seed provenance logged for reproducibility audits. */
    generationTraceId: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false },
);

chapterAssetSchema.index({ bookId: 1, chapterIndex: 1, assetSlot: 1 }, { unique: true });

export type ChapterAsset = InferSchemaType<typeof chapterAssetSchema>;

export const ChapterAsset: Model<ChapterAsset> =
  (mongoose.models.ChapterAsset as Model<ChapterAsset> | undefined) ??
  mongoose.model<ChapterAsset>("ChapterAsset", chapterAssetSchema);

export { ASSET_SLOTS };
