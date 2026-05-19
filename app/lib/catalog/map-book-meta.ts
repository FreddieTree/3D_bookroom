import type { BookMeta } from "@/app/lib/data/books";

/** Mongo catalog `books` collection（lean）。 */
export type BookCatalogLeanDoc = Readonly<{
  bookId: string;
  title: string;
  titleEn: string;
  author: string;
  coverColor: string;
  coverEmoji?: string;
  shortDesc: string;
  totalChapters: number;
  estimatedHours: number;
  isReady: boolean;
}>;

/** 供 `/api/books`、客户端书架与静态 `BOOKS` 兜底融合。 */
export function mapDbBookToBookMeta(doc: BookCatalogLeanDoc): BookMeta {
  return {
    id: doc.bookId,
    title: doc.title,
    titleEn: doc.titleEn,
    author: doc.author,
    coverColor: doc.coverColor,
    coverEmoji: doc.coverEmoji,
    shortDesc: doc.shortDesc,
    totalChapters: doc.totalChapters,
    estimatedHours: doc.estimatedHours,
    isReady: doc.isReady,
    progress: 0,
  };
}
