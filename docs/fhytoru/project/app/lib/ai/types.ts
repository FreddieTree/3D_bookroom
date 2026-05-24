/**
 * AI 层公共类型定义（成员 2 维护）。
 *
 * 这里只放接口与数据结构；任何具体实现位于 `app/lib/ai/local/` 或 `app/lib/ai/remote/`。
 * 现有的 `ChatMessage` / `PendingQuestion` 暂时透传自 `@/app/lib/mock/chat`，
 * 待 Step 3 扩字段时再升级为权威类型。
 */

import type {
  ChatMessage,
  PendingQuestion,
} from "@/app/lib/mock/chat";

export type { ChatMessage, PendingQuestion };

/** Step 4 之后会窄化为 union（`"taming" | "rose-uniqueness" | ...`） */
export type ConceptId = string;

export interface AiContext {
  bookId: string;
  /** 0-based */
  chapterIndex: number;
  /** 用户当前阅读 anchor，null 表示尚未定位 */
  paragraphId: string | null;
}

export type SpoilerKind = "ok" | "defer" | "soft-defer";

export interface SpoilerVerdict {
  kind: SpoilerKind;
  /** Step 3 起作为权威字段；Step 1 阶段可缺省 */
  revealAfterParagraphId?: string;
  /** 旧 UI 仍读这个；由 provider 负责回填以保持 UI 兼容 */
  revealAfterChapter?: number;
  matchedEntity?: string;
  reason?: string;
  /** 入队时显示的剧透提示文案（用户可见） */
  spoilerCopy?: string;
}

export interface Citation {
  paragraphId: string;
  /** 用作 hover/长按预览的短句（≤ 60 字） */
  snippet: string;
}

export interface AiAnswer {
  text: string;
  citations: Citation[];
  conceptId?: ConceptId;
  /** 「卖关子」线索：未读部分摘要，给后续 UI 渲染用 */
  teaser?: string;
}

export interface IAiProvider {
  readonly name: string;

  /** 判定一条用户提问是否构成剧透 */
  judgeSpoiler(text: string, ctx: AiContext): SpoilerVerdict;

  /**
   * 流式回答用户提问。`onToken` 在每个增量更新时被调用，返回值为最终完整答案。
   * 调用方需要保证：仅在 `judgeSpoiler` 返回 `kind === "ok"` 时调用。
   */
  streamAsk(
    text: string,
    ctx: AiContext,
    onToken: (partial: string) => void,
  ): Promise<AiAnswer>;

  /**
   * 同步生成「揭晓回答」。`ChatDrawer` 的 pending-release 卡片是即时弹出，
   * 不走流式，因此签名设计为同步。
   */
  composeReleaseAnswer(
    pending: PendingQuestion,
    ctx: AiContext,
  ): AiAnswer;
}
