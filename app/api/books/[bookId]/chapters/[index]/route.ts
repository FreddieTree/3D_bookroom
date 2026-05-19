import { connectDB } from "@/app/lib/db/mongodb";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { getChapterByBookAndIndex } from "@/app/lib/db/repositories/chapterRepository";

type Params = Promise<{ bookId: string; index: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  try {
    const { bookId, index } = await context.params;
    const ordinal = Number.parseInt(index, 10);
    if (Number.isNaN(ordinal)) {
      return Response.json({ error: "INVALID_INDEX", message: `章节序号非法：${index}` }, {
        status: 400,
      });
    }

    await connectDB();
    const chapter = await getChapterByBookAndIndex(bookId, ordinal);

    if (!chapter) {
      return Response.json(
        { error: "CHAPTER_NOT_FOUND", message: `未找到 ${bookId} 的第 ${ordinal} 章` },
        { status: 404 },
      );
    }

    return Response.json({ data: chapter });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
