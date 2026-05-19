import { connectDB } from "@/app/lib/db/mongodb";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { listChaptersByBook } from "@/app/lib/db/repositories/chapterRepository";
import { normalizeDbChapterDocs } from "@/app/lib/reader/normalize-db-chapters";

type Params = Promise<{ bookId: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  try {
    const { bookId } = await context.params;

    await connectDB();
    const docs = await listChaptersByBook(bookId);

    const data =
      docs.length > 0 ? normalizeDbChapterDocs(docs as never[]) : [];

    return Response.json({ data });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
