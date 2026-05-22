/**
 * Canonical chapter payloads per book (`chapters` collection).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const paragraphSchema = new Schema(
  {
    /** Unique paragraph fingerprint within chapter for spoiler + progress syncing. */
    id: { type: String, required: true },
    /** Reader-facing narration text blob. */
    text: { type: String, required: true },
    /** Order within chapter (zero-based sequencing). */
    order: { type: Number, required: true },
    /** Whether UI should accent this beat (set dressings, cinematography cues). */
    isKeyScene: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const chapterSchema = new Schema(
  {
    /** Parent book identifier matching `books.bookId`. */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Zero-based chapter ordinal matching reader router segments. */
    index: { type: Number, required: true },
    /** Chapter heading surfaced in TOC + breadcrumbs. */
    title: { type: String, required: true },
    /** Optional lyrical subtitle rendered under chapter title. */
    subtitle: { type: String },
    /** Ordered narration blocks powering reader pagination. */
    paragraphs: {
      type: [paragraphSchema],
      required: true,
      validate: [(v: unknown[]) => Array.isArray(v) && v.length > 0, "paragraphs required"],
    },
    /** Cached denominator for spoiler graph + progress bars. */
    totalParagraphs: { type: Number, required: true, min: 1 },
    /** Creative direction tag bridging music + viz pipelines (dreamy/tense/etc.). */
    mood: { type: String, required: true, trim: true },
    /**
     * 章节在长书中的位置（前言 / 正文 / 后记）。
     * 旧数据可为空——清洗脚本会与 `bodyIndex` 一并回填。
     */
    chapterType: {
      type: String,
      enum: ["frontmatter", "body", "backmatter"],
      default: "body",
    },
    /**
     * `chapterType === "body"` 时在正文内的连续序号（从 1 起）；前言/后记为 `null`。
     */
    /** 非正文章节在清洗脚本中会被置为 `null` */
    bodyIndex: { type: Number, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chapterSchema.index({ bookId: 1, index: 1 }, { unique: true });

export type Chapter = InferSchemaType<typeof chapterSchema>;

export const Chapter: Model<Chapter> =
  (mongoose.models.Chapter as Model<Chapter> | undefined) ??
  mongoose.model<Chapter>("Chapter", chapterSchema);
