/**
 * 概念路由与回答素材选择（成员 2 维护）。
 *
 * 这里不放具体模板（模板写在 little-prince.json 里），只放：
 *   - 「在多个候选 concept 中如何选一个主答」的策略
 *   - 「都没命中时的兜底素材」
 *
 * Step 4 之后所有非剧透回答都从这里产出。
 */

import { conceptById, paragraphOrderIndex } from "@/app/lib/ai/data/littlePrince";
import type {
  PreprocessedConcept,
} from "@/app/lib/ai/data/schema";

/**
 * 在多个命中 concept 中选一个：
 *   1. 偏好「最早可揭晓」的（revealAfterParagraphId 序号小），让用户更可能立刻读懂
 *   2. 平手时按 concepts JSON 的出现顺序（语义上更主线的写在前）
 */
export function pickPrimaryConcept(
  conceptIds: readonly string[],
): PreprocessedConcept | null {
  const arr: PreprocessedConcept[] = [];
  for (const id of conceptIds) {
    const c = conceptById.get(id);
    if (c) arr.push(c);
  }
  if (arr.length === 0) return null;
  arr.sort((a, b) => {
    const oa = a.revealAfterParagraphId
      ? paragraphOrderIndex.get(a.revealAfterParagraphId) ?? Infinity
      : Infinity;
    const ob = b.revealAfterParagraphId
      ? paragraphOrderIndex.get(b.revealAfterParagraphId) ?? Infinity
      : Infinity;
    return oa - ob;
  });
  return arr[0] ?? null;
}

/**
 * 用一个稳定 hash 决定挑哪个模板变体——同一句问题在 demo 多次重放时回放一致。
 */
export function stableIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % modulo;
}

export function pickTemplate(
  concept: PreprocessedConcept,
  seed: string,
): string {
  if (concept.templates.length === 0) {
    return "（这一段我还没准备好回答，请换一种问法试试。）";
  }
  return concept.templates[stableIndex(seed, concept.templates.length)];
}

export function pickTeaser(
  concept: PreprocessedConcept,
  seed: string,
): string | undefined {
  if (concept.teasers.length === 0) return undefined;
  return concept.teasers[stableIndex(seed + ":teaser", concept.teasers.length)];
}

/**
 * 兜底回答素材：用户问题没命中任何 concept / entity 时用。
 * 文案延续旧 mock 的「邀请用户细化提问」语气。
 */
export const FALLBACK_TEXTS = {
  tooShort: "你可以具体写一段原文或你的困惑，我会顺着文本的语气回答。",
  noHit:
    "这一段像是在说：真正重要的东西，眼睛常常看不见，要用心去体会。你也可以再点名一段话，我尽量用更接近文本的方式陪你读。",
} as const;
