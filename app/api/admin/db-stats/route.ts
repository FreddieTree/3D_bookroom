import { NextResponse } from "next/server";

import { connectDB } from "@/app/lib/db/mongodb";
import { Book } from "@/app/lib/db/models/books";
import { Chapter } from "@/app/lib/db/models/chapters";

/**
 * 开发/运维用：统计 Mongo 中书与章节数量。
 * 生产环境默认 404；需在 `.env.local` 设置 ENABLE_DB_STATS_ADMIN=true 才开放。
 */
export async function GET() {
  if (process.env.ENABLE_DB_STATS_ADMIN !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectDB();
    const books = await Book.countDocuments();
    const chapters = await Chapter.countDocuments();
    const chaptersPerBook = await Chapter.aggregate([
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
    const sampleBook = await Book.findOne().lean().exec();

    return NextResponse.json({
      books,
      chapters,
      chaptersPerBook,
      sampleBook,
    });
  } catch (error) {
    console.error("[db-stats]", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
