import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import {
  addMessage,
  getOrCreateConversation,
} from "@/app/lib/db/repositories/conversationRepository";

const MAX_CHARS = 12_000;

type EntryRole = "user" | "assistant" | "system";

type AppendBody = {
  bookId?: string;
  userId?: string;
  entries?: { role: EntryRole; content: string }[];
};

function clip(s: string) {
  return s.length <= MAX_CHARS ? s : `${s.slice(0, MAX_CHARS)}…`;
}

/**
 * 将一轮或多轮对话条目追加到 Mongo（与 ChatDrawer → Zustand 并行）。
 * 失败静默：不阻塞前端；用于审计 / 多端复盘 / 未来同步。
 */
export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as AppendBody;
    const bookId = raw.bookId?.trim();
    const userId = raw.userId?.trim() || DEFAULT_DEMO_USER_ID;
    const entries = raw.entries ?? [];

    if (!bookId) {
      return Response.json(
        { error: "VALIDATION_ERROR", message: "bookId 必填" },
        { status: 400 },
      );
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return Response.json(
        { error: "VALIDATION_ERROR", message: "entries 必须为非空数组" },
        { status: 400 },
      );
    }

    await connectDB();
    const conv = await getOrCreateConversation(userId, bookId);
    const cid = conv?._id ? String(conv._id) : null;

    if (!cid) {
      return Response.json(
        { error: "DATABASE_UNAVAILABLE", message: "无法创建会话" },
        { status: 500 },
      );
    }

    for (const row of entries) {
      const role =
        row.role === "assistant" ||
        row.role === "system" ||
        row.role === "user"
          ? row.role
          : null;
      if (!role) continue;

      const text = clip(String(row.content ?? "").trim());
      if (!text) continue;

      await addMessage(cid, { role, content: text });
    }

    return Response.json({ ok: true, appended: entries.length });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
