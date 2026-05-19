/**
 * Lightweight community carousel entries (`communityshares`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VISIBILITY_LEVELS = ["public", "unlisted", "private"] as const;

const communityShareSchema = new Schema(
  {
    /** Author user id (`users.userId`). */
    userId: { type: String, required: true, index: true, trim: true },
    /** Optional anchored book (`books.bookId`). */
    bookId: { type: String, trim: true, index: true },
    /** Stable slug appended to `/share/:slug`. */
    slug: { type: String, required: true, unique: true, trim: true },
    /** Card title for featured rail. */
    title: { type: String, required: true, trim: true },
    /** Short synopsis / pull quote rendered in masonry grid. */
    excerpt: { type: String, required: true, trim: true },
    /** Optional hero thumbnail when user exports viz assets. */
    previewImageUrl: { type: String, trim: true },
    /** Visibility gates for moderation. */
    visibility: { type: String, required: true, enum: VISIBILITY_LEVELS, default: "public" },
    /** Cheap engagement counters (future migration to relational likes). */
    stats: {
      likes: { type: Number, required: true, default: 0 },
      impressions: { type: Number, required: true, default: 0 },
    },
    /** Featured flag for curator tooling. */
    isFeatured: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, versionKey: false },
);

export type CommunityShare = InferSchemaType<typeof communityShareSchema>;

export const CommunityShare: Model<CommunityShare> =
  (mongoose.models.CommunityShare as Model<CommunityShare> | undefined) ??
  mongoose.model<CommunityShare>("CommunityShare", communityShareSchema);

export { VISIBILITY_LEVELS };
