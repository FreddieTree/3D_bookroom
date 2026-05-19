import { connectDB } from "@/app/lib/db/mongodb";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { getBookById } from "@/app/lib/db/repositories/bookRepository";

type Params = Promise<{ bookId: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  try {
    const { bookId } = await context.params;

    await connectDB();
    const book = await getBookById(bookId);

    if (!book) {
      return Response.json({ error: "BOOK_NOT_FOUND", message: `未找到书目 ${bookId}` }, {
        status: 404,
      });
    }

    return Response.json({ data: book });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
