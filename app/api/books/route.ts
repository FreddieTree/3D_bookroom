import { mapDbBookToBookMeta } from "@/app/lib/catalog/map-book-meta";
import { connectDB } from "@/app/lib/db/mongodb";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { listPublicReadyBooks } from "@/app/lib/db/repositories/bookRepository";

export async function GET() {
  try {
    await connectDB();
    const docs = await listPublicReadyBooks();
    const data = docs.map((doc) => mapDbBookToBookMeta(doc as never));
    return Response.json({ data });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
