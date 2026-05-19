/**
 * Persistence for conversational AI buffers (MiniMax placeholders today).
 */
import { randomUUID } from "crypto";

import { Conversation } from "@/app/lib/db/models/conversations";

export async function getOrCreateConversation(userId: string, bookId: string, topic = "default") {
  return Conversation.findOneAndUpdate(
    { userId, bookId, topic },
    {
      $set: { lastMessageAt: new Date() },
      $setOnInsert: { messages: [], userId, bookId, topic },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .exec();
}

export async function addMessage(
  conversationId: string,
  message: { role: "user" | "assistant" | "system"; content: string },
) {
  const messageId = randomUUID();

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $push: {
        messages: {
          messageId,
          role: message.role,
          content: message.content,
          createdAt: new Date(),
        },
      },
      $set: { lastMessageAt: new Date() },
    },
  );

  return messageId;
}

export async function getRecentMessages(userId: string, bookId: string, limit: number) {
  const doc = await Conversation.findOne({ userId, bookId, topic: "default" }).lean().exec();
  if (!doc?.messages?.length) return [];
  return doc.messages.slice(Math.max(doc.messages.length - limit, 0));
}
