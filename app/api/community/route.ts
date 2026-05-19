import { connectDB } from "@/app/lib/db/mongodb";
import { databaseErrorResponse } from "@/app/lib/db/http";
import {
  listFeaturedShares,
  listPublicShares,
} from "@/app/lib/db/repositories/communityShareRepository";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const featured = params.get("featured") === "1";
    const limit = Number(params.get("limit") ?? "40");

    await connectDB();
    const data = featured ? await listFeaturedShares(limit) : await listPublicShares(limit);

    return Response.json({ featured, data });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
