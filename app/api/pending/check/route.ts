import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { checkReadyPendings } from "@/app/lib/db/repositories/pendingQuestionRepository";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId") ?? DEFAULT_DEMO_USER_ID;
    const bookId = params.get("bookId");
    const paragraphId = params.get("paragraphId");

    if (!bookId || !paragraphId) {
      return Response.json(
        { error: "VALIDATION_ERROR", message: "bookId、paragraphId 为必填查询参数。" },
        { status: 400 },
      );
    }

    await connectDB();
    const ready = await checkReadyPendings(userId, bookId, paragraphId);

    return Response.json({
      paragraphId,
      readyCount: ready.length,
      data: ready,
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
