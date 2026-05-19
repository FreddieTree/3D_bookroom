import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import { aggregateUsageLogs } from "@/app/lib/db/repositories/usageLogRepository";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId") ?? DEFAULT_DEMO_USER_ID;
    const horizonDays = Number(params.get("days") ?? "7");

    await connectDB();
    const summary = await aggregateUsageLogs(userId, horizonDays);

    return Response.json({ data: summary });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
