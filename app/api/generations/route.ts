import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { listGeneratedForUser } from "@/app/lib/db/repositories/generatedContentRepository";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId") ?? DEFAULT_DEMO_USER_ID;
    const limit = Number(params.get("limit") ?? "48");

    await connectDB();
    const items = await listGeneratedForUser(userId, limit);

    return Response.json({ data: items });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
