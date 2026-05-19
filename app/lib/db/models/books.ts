/**
 * Shared catalog schema: `books` collection.
 *
 * Holds metadata for immersive reading demos and production titles.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BOOK_LANGUAGES = ["zh", "en", "bilingual"] as const;
const BOOK_VISIBILITY = ["public", "private"] as const;

/** Main book document persisted in Atlas. */
const bookSchema = new Schema(
  {
    /** Stable identifier used everywhere in URLs and foreign keys (`little-prince`, etc.). */
    bookId: { type: String, required: true, unique: true, index: true, trim: true },
    /** Localized display title shown in bookshelf UI / metadata. */
    title: { type: String, required: true, trim: true },
    /** Optional complementary English subtitle or transliteration for bilingual UX. */
    titleEn: { type: String, required: true, trim: true },
    /** Canonical author attribution string. */
    author: { type: String, required: true, trim: true },
    /** Remote cover image URL once assets are finalized in CDN/object storage. */
    coverUrl: { type: String, trim: true },
    /** CSS-friendly warm tone label for placeholders (e.g. `#b8763e`). */
    coverColor: { type: String, required: true, trim: true },
    /** Fallback emoji thumbnail when CDN art is unavailable. */
    coverEmoji: { type: String, trim: true },
    /** Short marketing/description blurb surfaced on cards (<200 chars UX target). */
    shortDesc: { type: String, required: true, trim: true },
    /** Editorial long-form synopsis for detail pages when needed. */
    longDesc: { type: String, trim: true },
    /** Derived count of authored chapters belonging to `chapters`. */
    totalChapters: { type: Number, required: true, min: 0 },
    /** Sum of paragraphs across chapters for ETA / spoiler layout heuristics. */
    totalParagraphs: { type: Number, required: true, min: 0 },
    /** Estimated human reading duration in hours based on calibrated WPM benchmarks. */
    estimatedHours: { type: Number, required: true, min: 0 },
    /** Primary narrative language tagging for narration + UI defaults. */
    language: {
      type: String,
      required: true,
      enum: BOOK_LANGUAGES,
    },
    /** Whether narrative assets are ingest-complete for user consumption. */
    isReady: { type: Boolean, required: true, default: false },
    /** Public catalog vs private drafts / partner-only builds. */
    status: {
      type: String,
      required: true,
      enum: BOOK_VISIBILITY,
    },
    /** Optional calendar year attribution for anthology metadata. */
    publishedYear: { type: Number, min: 0 },
    /** Curated hashtags / genre taxonomy for personalization engines. */
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Book = InferSchemaType<typeof bookSchema>;

/** Mongoose accessor with hot-reload safe registration. */
export const Book: Model<Book> =
  (mongoose.models.Book as Model<Book> | undefined) ?? mongoose.model<Book>("Book", bookSchema);

export { BOOK_LANGUAGES, BOOK_VISIBILITY };
