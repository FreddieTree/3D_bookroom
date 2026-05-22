"use client";

import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";

const MAX_CHARS = 12_000;

/**
 * Fire-and-forget：把本轮对话写入 Mongo `/api/conversations/append`。
 * 不改变 Zustand 体验；Mongo 不可用或离线时静默失败。
 */
export function enqueueConversationPersist(
  bookId: string,
  entries: { role: "user" | "assistant" | "system"; content: string }[],
  userId = DEFAULT_DEMO_USER_ID,
): void {
  if (typeof window === "undefined" || !bookId || entries.length === 0) return;

  const safe = entries.map((e) => ({
    role: e.role,
    content:
      e.content.length <= MAX_CHARS
        ? e.content
        : `${e.content.slice(0, MAX_CHARS)}…`,
  }));

  try {
    void fetch("/api/conversations/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ bookId, userId, entries: safe }),
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
