/**
 * 兼容门面（thin facade）—— 不要在这里写新逻辑。
 *
 * 历史背景：项目早期 AI 智能集中在本文件，写死了关键词剧透判定 + 4 个模板。
 * 现在所有实现已迁入 `app/lib/ai/` 下的 `LocalAiProvider`，
 * 本文件保留为：
 *   1. 类型导出（`ChatMessage` / `PendingQuestion` / `ChatMessageType`），
 *      因为有 6 个组件直接 import 这些类型，路径迁移成本高。
 *   2. 旧函数名转发（`shouldDeferAsSpoiler` / `spoilerQueueCopy` /
 *      `mockChatResponse` / `mockReleaseAnswer` / `streamChars` /
 *      `pickNormalReply`），供未迁移的调用方过渡使用。
 *
 * 新代码请直接 `import { getAiProvider } from "@/app/lib/ai/provider"`。
 */

import {
  legacyMockChatResponse,
  legacyMockReleaseAnswer,
  legacyPickNormalReply,
  legacyShouldDeferAsSpoiler,
  legacySpoilerQueueCopy,
  legacyStreamChars,
} from "@/app/lib/ai/local/legacyAdapter";

export type ChatMessageType = "normal" | "spoiler-blocked" | "pending-release";

export interface ChatMessageCitation {
  paragraphId: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  type: ChatMessageType;
  pendingId?: string;
  /** Unix ms — persist 友好 */
  createdAt: number;
  isStreaming?: boolean;
  /**
   * v2 新增：AI 回答引用的段落 id + 短摘录。UI 暂未渲染；
   * 后续可作为「出自第 N 段」chip / 阅读地图节点联动用。
   */
  citations?: ChatMessageCitation[];
  /** v2 新增：本回答主 concept id（仅 AI 消息且命中时填写） */
  conceptId?: string;
}

export interface PendingQuestion {
  id: string;
  userQuestion: string;
  paragraphId: string | null;
  /**
   * 旧字段（v1）：旧 UI 仍读它显示「第 N 章揭晓」。
   * v2 起作为 derived 字段，由 `revealAfterParagraphId` 反推维护。
   */
  revealAfterChapter: number;
  /**
   * v2 新增 · 权威字段：用户读到此段（含）之后，剧透可揭晓。
   * v1 老数据迁移时根据 `revealAfterChapter` 推断为该章首段。
   */
  revealAfterParagraphId?: string;
  /**
   * v2 新增 · 队列状态：`pending`（用户尚未读到揭晓点）/ `ready`（已读到，等用户主动看）。
   * UI 暂未消费此字段；成员 1 后续可基于它升级红点视觉。
   */
  status?: "pending" | "ready";
  /** v2 新增：命中的 entity / concept id，便于后续 UI 显示「答案关于：X」。 */
  matchedEntity?: string;
}

export const shouldDeferAsSpoiler = legacyShouldDeferAsSpoiler;
export const streamChars = legacyStreamChars;
export const pickNormalReply = legacyPickNormalReply;
export const spoilerQueueCopy = legacySpoilerQueueCopy;
export const mockReleaseAnswer = legacyMockReleaseAnswer;
export const mockChatResponse = legacyMockChatResponse;
