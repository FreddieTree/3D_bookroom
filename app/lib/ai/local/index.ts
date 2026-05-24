/**
 * LocalAiProvider —— 本地确定性 AI 引擎（成员 2 维护）。
 *
 * 当前实现状态：
 *   - judgeSpoiler   : 段落级精确判定（《小王子》）/ 关键词兜底（其它书）
 *   - streamAsk      : 概念路由 + 检索 + 模板 composer + 进度感知裁切（《小王子》）/ 老模板（其它书）
 *   - composeReleaseAnswer : 命中 concept 时用主模板「揭晓」；缺概念时退回 legacy 文案
 *
 * 真实远端 provider（MiniMax，已交付）：见 `app/lib/ai/remote/minimaxProvider.ts`。
 */

import { pickPrimaryConcept } from "@/app/lib/ai/local/concepts";
import { composeAnswer } from "@/app/lib/ai/local/compose";
import {
  legacyMockChatResponse,
  legacyMockReleaseAnswer,
} from "@/app/lib/ai/local/legacyAdapter";
import {
  scanQuery,
  scoreParagraphs,
  topKParagraphs,
} from "@/app/lib/ai/local/retrieval";
import { judgeSpoilerForBook } from "@/app/lib/ai/local/spoiler";
import { streamChars } from "@/app/lib/ai/local/stream";
import { LITTLE_PRINCE_BOOK_ID } from "@/app/lib/ai/data/littlePrince";
import type {
  AiAnswer,
  AiContext,
  IAiProvider,
  PendingQuestion,
  SpoilerVerdict,
} from "@/app/lib/ai/types";

export class LocalAiProvider implements IAiProvider {
  readonly name = "local";

  judgeSpoiler(text: string, ctx: AiContext): SpoilerVerdict {
    return judgeSpoilerForBook(text, ctx);
  }

  async streamAsk(
    text: string,
    ctx: AiContext,
    onToken: (partial: string) => void,
  ): Promise<AiAnswer> {
    if (ctx.bookId !== LITTLE_PRINCE_BOOK_ID) {
      const reply = await legacyMockChatResponse(text, ctx.paragraphId, onToken);
      return { text: reply, citations: [] };
    }

    const scan = scanQuery(text);
    const primary = pickPrimaryConcept(scan.conceptIds);
    const scored = scoreParagraphs({
      bookId: ctx.bookId,
      query: text,
      anchorParagraphId: ctx.paragraphId,
      conceptIds: scan.conceptIds,
      entityIds: scan.entityIds,
    });
    const candidates = topKParagraphs(scored, 6);
    const answer = composeAnswer({ query: text, ctx, primary, candidates });
    await streamChars(answer.text, onToken);
    return answer;
  }

  composeReleaseAnswer(
    pending: PendingQuestion,
    ctx: AiContext,
  ): AiAnswer {
    if (ctx.bookId !== LITTLE_PRINCE_BOOK_ID) {
      return { text: legacyMockReleaseAnswer(pending), citations: [] };
    }
    const scan = scanQuery(pending.userQuestion);
    const primary = pickPrimaryConcept(scan.conceptIds);
    const scored = scoreParagraphs({
      bookId: ctx.bookId,
      query: pending.userQuestion,
      anchorParagraphId: ctx.paragraphId,
      conceptIds: scan.conceptIds,
      entityIds: scan.entityIds,
    });
    const candidates = topKParagraphs(scored, 6);
    const head = `还记得你问的「${truncate(pending.userQuestion, 36)}」吗？`;
    const body = composeAnswer({
      query: pending.userQuestion,
      ctx,
      primary,
      candidates,
    });
    return {
      ...body,
      text: `${head}${body.text}`,
    };
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
