/**
 * Reads + light joins on the shared catalog `books` collection.
 */
import { Book } from "@/app/lib/db/models/books";
import { ReadingProgress } from "@/app/lib/db/models/readingProgress";

/** Return every cached catalog row (lightweight bookshelf payload). */
export async function getAllBooks() {
  return Book.find().sort({ createdAt: -1 }).lean().exec();
}

/**
 * 首页 / library / API：`status: public`，且不向 demo 隐藏（清洗脚本回填 `demoVisible`）。
 * `demoVisible: false` 或缺省为 false（若写入）则被排除；未设置字段的旧文档视同可见。
 */
export async function listPublicReadyBooks() {
  return Book.find({
    status: "public",
    $nor: [{ demoVisible: false }],
  })
    .sort({ isReady: -1, title: 1 })
    .lean()
    .exec();
}

/** Fetch deterministic metadata keyed by slug id (`little-prince`). */
export async function getBookById(bookId: string) {
  return Book.findOne({ bookId }).lean().exec();
}

/**
 * Personalized ordering respecting last reading activity (member 3 hero shelf).
 *
 * Falls back silently when no progress docs exist yet.
 */
export async function getBooksByUserProgress(userId: string) {
  const progresses = await ReadingProgress.find({ userId }).sort({ updatedAt: -1 }).lean().exec();

  const bookIds = progresses.map((p) => p.bookId);
  const books = await Book.find({ bookId: { $in: bookIds } }).lean().exec();
  const byId = new Map(books.map((b) => [b.bookId, b]));

  return progresses.map((p) => ({
    progress: p,
    book: byId.get(p.bookId) ?? null,
  }));
}
