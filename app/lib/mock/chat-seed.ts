import type { ChatMessage } from "@/app/lib/mock/chat";

/** 演示用对话历史（无本地消息时展示，便于右滑打开 ChatDrawer 路演）。 */
const LITTLE_PRINCE_SEED: ChatMessage[] = [
  {
    id: "seed-1",
    role: "ai",
    type: "normal",
    content: "你好，我读的是《小王子》这一章的开头。你希望我从哪里陪你读下去？",
    createdAt: Date.now() - 1000 * 60 * 72,
    isStreaming: false,
  },
  {
    id: "seed-2",
    role: "user",
    type: "normal",
    content: "第一段里绵羊和帽子的桥段，我总觉得有点难过。",
    createdAt: Date.now() - 1000 * 60 * 70,
    isStreaming: false,
  },
  {
    id: "seed-3",
    role: "ai",
    type: "normal",
    content:
      "大人只想看见帽子，小王子看见的是吞下大象的蟒蛇——这里藏着一种孤独：解释权不同，世界也会不同。你如果愿意，可以告诉我你最近一次「被看懂」是什么时候。",
    createdAt: Date.now() - 1000 * 60 * 69,
    isStreaming: false,
  },
];

export function getSeedChatHistoryForBook(bookId: string): ChatMessage[] {
  if (bookId === "little-prince") return LITTLE_PRINCE_SEED;
  return [];
}
