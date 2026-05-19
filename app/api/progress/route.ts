import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import {
  getProgress,
  syncProgress,
  updateProgress,
} from "@/app/lib/db/repositories/readingProgressRepository";

type ProgressBody = {
  userId?: string;
  bookId?: string;
  chapterIndex: number;
  paragraphId: string;
  deviceId?: string;
  percentComplete?: number;
  syncVersion?: number;
  mode?: "update" | "sync";
};

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId") ?? DEFAULT_DEMO_USER_ID;
    const bookId = params.get("bookId");

    if (!bookId) {
      return Response.json({ error: "VALIDATION_ERROR", message: "bookId 为必填查询参数。" }, {
        status: 400,
      });
    }

    await connectDB();
    const progress = await getProgress(userId, bookId);

    if (!progress) {
      return Response.json({ error: "PROGRESS_NOT_FOUND", message: "尚无阅读进度。" }, {
        status: 404,
      });
    }

    return Response.json({ data: progress });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProgressBody;
    const userId = body.userId?.trim() || DEFAULT_DEMO_USER_ID;
    const bookId = body.bookId?.trim();

    if (!bookId) {
      return Response.json({ error: "VALIDATION_ERROR", message: "bookId 必填。" }, { status: 400 });
    }

    if (typeof body.chapterIndex !== "number" || !body.paragraphId?.trim()) {
      return Response.json(
        {
          error: "VALIDATION_ERROR",
          message: "chapterIndex、paragraphId 为必填字段。",
        },
        { status: 400 },
      );
    }

    await connectDB();

    if ((body.mode ?? "update") === "sync") {
      const outcome = await syncProgress(userId, bookId, {
        chapterIndex: body.chapterIndex,
        paragraphId: body.paragraphId,
        deviceId: body.deviceId,
        percentComplete: body.percentComplete,
        syncVersion: body.syncVersion,
      });

      if (outcome.conflict) {
        return Response.json(
          {
            error: "SYNC_VERSION_CONFLICT",
            message: "远端 syncVersion 更加新；请先在客户端刷新最新进度后再提交。",
            progress: outcome.progress,
          },
          { status: 409 },
        );
      }

      return Response.json({ data: outcome.progress });
    }

    const saved = await updateProgress(userId, bookId, {
      chapterIndex: body.chapterIndex,
      paragraphId: body.paragraphId,
      deviceId: body.deviceId,
      percentComplete: body.percentComplete,
    });

    return Response.json({ data: saved });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
