import { connectDB } from "@/app/lib/db/mongodb";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { databaseErrorResponse } from "@/app/lib/db/http";
import {
  addMessage,
  getOrCreateConversation,
} from "@/app/lib/db/repositories/conversationRepository";

type ChatBody = {
  userId?: string;
  bookId?: string;
  message?: string;
};

type ChatReply = {
  reply: string;
  type: "normal" | "spoiler-blocked";
  pendingId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatBody;
    const userId = body.userId?.trim() || DEFAULT_DEMO_USER_ID;
    const bookId = body.bookId?.trim();
    const message = body.message?.trim();

    if (!bookId || !message) {
      return Response.json(
        { error: "VALIDATION_ERROR", message: "bookId 与 message 为必填字段。" },
        { status: 400 },
      );
    }

    await connectDB();
    const conversation = await getOrCreateConversation(userId, bookId);
    if (conversation?._id) {
      await addMessage(String(conversation._id), { role: "user", content: message });
    }

    const mock: ChatReply = {
      reply:
        "（Mock）成员 2 尚未接入 MiniMax：我会记住你的问题，待真实对话层上线后在此返回完整回复。",
      type: "normal",
    };

    return Response.json(mock);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
