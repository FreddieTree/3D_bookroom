/**
 * Cached generative media rows (`generatedcontents`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const GENERATION_KINDS = ["image", "audio", "video", "music", "narration", "text"] as const;

const generatedContentSchema = new Schema(
  {
    /** Owner user id. */
    userId: { type: String, required: true, index: true, trim: true },
    /** Optional book anchor. */
    bookId: { type: String, trim: true, index: true },
    /** Optional chapter anchor. */
    chapterIndex: { type: Number, min: 0 },
    /** Optional paragraph anchor for inline assets. */
    paragraphId: { type: String, trim: true },
    /** Asset classification for gallery filters. */
    kind: { type: String, required: true, enum: GENERATION_KINDS },
    /** Final CDN URL or relative path. */
    assetUrl: { type: String, trim: true },
    /** Original human prompt for auditing. */
    prompt: { type: String, trim: true },
    /** Provider metadata (model id, latency, cost units). */
    providerMeta: {
      model: { type: String, trim: true },
      tokenIn: { type: Number },
      tokenOut: { type: Number },
      latencyMs: { type: Number },
    },
    /** Arbitrary JSON payload for MiniMax responses. */
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

generatedContentSchema.index({ userId: 1, createdAt: -1 });

export type GeneratedContent = InferSchemaType<typeof generatedContentSchema>;

export const GeneratedContent: Model<GeneratedContent> =
  (mongoose.models.GeneratedContent as Model<GeneratedContent> | undefined) ??
  mongoose.model<GeneratedContent>("GeneratedContent", generatedContentSchema);

export { GENERATION_KINDS };
