/**
 * Spoiler graph annotations per book (`spoilermaps` auto-plural by Mongoose).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SPOILER_LEVELS = ["major", "minor", "none"] as const;
const SPOILER_TYPES = ["plot", "character", "ending"] as const;

const entrySchema = new Schema(
  {
    /** Paragraph id this annotation references. */
    paragraphId: { type: String, required: true },
    /** Strength of protective warnings for reader surfaces. */
    spoilerLevel: { type: String, required: true, enum: SPOILER_LEVELS },
    /** Taxonomy for filtering / AI guardrails. */
    spoilerType: { type: String, required: true, enum: SPOILER_TYPES },
    /** Human-readable teaser or explanation for editors. */
    description: { type: String, required: true },
    /** Optional cross-links to other paragraph ids (chain reveals). */
    relatedTo: [{ type: String }],
  },
  { _id: false },
);

const spoilerMapSchema = new Schema(
  {
    /** Target book id. */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Monotonic version for cache busting when regenerated. */
    version: { type: Number, required: true, min: 1 },
    /** Dense annotation list powering spoiler UX + LLM safeguards. */
    entries: {
      type: [entrySchema],
      required: true,
    },
    /** Attribution for pipeline audits (manual, model-version, teammate id). */
    generatedBy: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false },
);

spoilerMapSchema.index({ bookId: 1, version: -1 });

export type SpoilerMap = InferSchemaType<typeof spoilerMapSchema>;

export const SpoilerMap: Model<SpoilerMap> =
  (mongoose.models.SpoilerMap as Model<SpoilerMap> | undefined) ??
  mongoose.model<SpoilerMap>("SpoilerMap", spoilerMapSchema);

export { SPOILER_LEVELS, SPOILER_TYPES };
