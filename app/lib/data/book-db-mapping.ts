/**
 * Bridges mock `BookMeta` (UI/CSS colors) ↔ Mongo-friendly rows (hex placeholders).
 */

import type { BookMeta } from "@/app/lib/data/books";

/** Fallback hex anchors when `coverColor` is a CSS blob (OKLCH / color-mix). */
const FALLBACK_HEX: Record<string, string> = {
  "little-prince": "#b8763e",
  "aq-zhengzhuan": "#4f6f63",
  "village-teacher": "#c45c3e",
  "death-of-ivan-ilyich": "#6b5344",
};

/**
 * Persistable solid color anchor for bookshelf JSON / thumbnails.
 * UI may still derive gradients from Tailwind independently.
 */
export function mongoCoverHex(book: Pick<BookMeta, "id">): string {
  return FALLBACK_HEX[book.id] ?? "#b8763e";
}

export function mongoLanguage(book: Pick<BookMeta, "id">): "zh" | "en" | "bilingual" {
  return book.id === "little-prince" ? "bilingual" : "zh";
}

export function mongoEstimatedParagraphs(book: BookMeta): number {
  if (book.id === "little-prince") {
    // actual count filled by seed via sample paragraphs
    return 0;
  }
  /** Stub ingest: exactly one scaffold paragraph until EPUB splitter lands */
  return 1;
}
