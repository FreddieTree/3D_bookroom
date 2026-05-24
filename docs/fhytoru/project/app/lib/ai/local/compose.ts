/**
 * 回答合成器（成员 2 维护）。
 *
 * 接口：
 *   composeAnswer({ query, ctx, primary?, citations }) → AiAnswer
 *
 * 关键行为：
 *   - 按用户当前 anchor 把候选 citation 切成 read / unread 两段
 *   - 选模板，注入对应 concept 的引用句作为开头
 *   - unread 非空 → 末尾追加 teaser「卖关子」
 *   - 全部未命中 → 用 FALLBACK_TEXTS.noHit / tooShort 兜底
 *
 * 引用形式：本期不强制 UI 改造，citations 数组照常返回（ChatMessage 字段是可选的
 * `citations[]`），但 `text` 里不内嵌「出自第 X 段」字样——交给后续 UI 升级。
 */

import {
  FALLBACK_TEXTS,
  pickTeaser,
  pickTemplate,
} from "@/app/lib/ai/local/concepts";
import { hasReadThrough } from "@/app/lib/ai/data/littlePrince";
import type { ScoredParagraph } from "@/app/lib/ai/local/retrieval";
import type {
  AiAnswer,
  AiContext,
  Citation,
} from "@/app/lib/ai/types";
import type {
  PreprocessedConcept,
} from "@/app/lib/ai/data/schema";

export interface ComposeInput {
  query: string;
  ctx: AiContext;
  /** retrieval 选出的主 concept；可能为 null（无任何命中） */
  primary: PreprocessedConcept | null;
  /** 已按分数倒序的候选段落 */
  candidates: ScoredParagraph[];
}

function makeSnippet(text: string, max = 60): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function composeAnswer(input: ComposeInput): AiAnswer {
  const { query, ctx, primary, candidates } = input;
  const trimmed = query.trim();

  if (trimmed.length < 4 && !primary) {
    return {
      text: FALLBACK_TEXTS.tooShort,
      citations: [],
    };
  }

  // 进度感知裁切：候选段落按是否已读划分
  const read: ScoredParagraph[] = [];
  const unread: ScoredParagraph[] = [];
  for (const c of candidates) {
    if (hasReadThrough(ctx.paragraphId, c.paragraphId)) read.push(c);
    else unread.push(c);
  }

  const citations: Citation[] = read.slice(0, 3).map((r) => ({
    paragraphId: r.paragraphId,
    snippet: makeSnippet(r.text),
  }));

  if (!primary) {
    return {
      text: FALLBACK_TEXTS.noHit,
      citations,
    };
  }

  const body = pickTemplate(primary, trimmed);
  const teaser =
    unread.length > 0 ? pickTeaser(primary, trimmed) : undefined;
  const text = teaser ? `${body}\n\n${teaser}` : body;

  return {
    text,
    citations,
    conceptId: primary.id,
    teaser,
  };
}
