/**
 * Visual direction bible per title (`visualstyles`).
 *
 * Produced by narrative art direction + teammate 3 multimodal tooling.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const visualStyleSchema = new Schema(
  {
    /** Target book canonical id (`books.bookId`). */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Human-friendly nickname for dashboards ("Desert Gouache Warm"). */
    name: { type: String, required: true, trim: true },
    /** Master prompt scaffolding for diffusion / video models (English preferred). */
    illustrationPromptTemplate: { type: String, required: true },
    /** Camera + lighting choreography notes for teammate 3 cinematography pipelines. */
    cinematographyNotes: { type: String, required: true },
    /** Dominant HEX palette anchor for deterministic UI overlays. */
    paletteAnchorHex: { type: String, required: true, trim: true },
    /** Keywords describing tonal temperature (dusty amber, cobalt night…). */
    moodKeywords: [{ type: String, trim: true }],
    /** Reference still URLs for human QC loops. */
    referenceImageUrls: [{ type: String, trim: true }],
    /** Whether this variant is authoritative for nightly renders. */
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

visualStyleSchema.index({ bookId: 1, name: 1 }, { unique: true });

export type VisualStyle = InferSchemaType<typeof visualStyleSchema>;

export const VisualStyle: Model<VisualStyle> =
  (mongoose.models.VisualStyle as Model<VisualStyle> | undefined) ??
  mongoose.model<VisualStyle>("VisualStyle", visualStyleSchema);
