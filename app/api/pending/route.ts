import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { findPendingQueue } from "@/app/lib/db/repositories/pendingQuestionRepository";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId") ?? DEFAULT_DEMO_USER_ID;
    const bookId = params.get("bookId") ?? undefined;
    const limit = Number(params.get("limit") ?? "25");

    await connectDB();
    const pendings = await findPendingQueue(userId, bookId, limit);

    return Response.json({ data: pendings });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
