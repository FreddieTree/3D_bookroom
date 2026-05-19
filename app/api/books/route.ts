import { connectDB } from "@/app/lib/db/mongodb";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { getAllBooks } from "@/app/lib/db/repositories/bookRepository";

export async function GET() {
  try {
    await connectDB();
    const books = await getAllBooks();
    return Response.json({ data: books });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
