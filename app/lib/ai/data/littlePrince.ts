/**
 * 《小王子》预处理产物运行时索引（成员 2 维护）。
 *
 * 模块加载时一次性构建：
 *   - paragraphOrderIndex: Map<paragraphId, ordinal>  —— 剧透判定 O(1) 比较
 *   - aliasToEntity:       Map<alias, entityId>      —— 长 alias 优先匹配
 *   - labelToConcepts:     Map<label, conceptId[]>   —— 多个 concept 可共享 label
 *   - entityById / conceptById：方便 retrieval / spoiler 查询
 *
 * 任何 JSON 字段错误（未知段落 id、缺 template 等）会在加载阶段 throw，
 * 避免运行时静默漏答。
 */

import littlePrinceJson from "@/app/lib/data/preprocessed/little-prince.json";
import {
  assertValidPreprocessedBook,
  type PreprocessedBook,
  type PreprocessedConcept,
  type PreprocessedEntity,
} from "@/app/lib/ai/data/schema";

const RAW = littlePrinceJson as PreprocessedBook;

assertValidPreprocessedBook(RAW);

export const LITTLE_PRINCE_BOOK_ID = RAW.bookId;

export const littlePrince: PreprocessedBook = RAW;

export const paragraphOrderIndex: ReadonlyMap<string, number> = new Map(
  RAW.paragraphOrder.map((id, i) => [id, i] as const),
);

export const entityById: ReadonlyMap<string, PreprocessedEntity> = new Map(
  RAW.entities.map((e) => [e.id, e] as const),
);

export const conceptById: ReadonlyMap<string, PreprocessedConcept> = new Map(
  RAW.concepts.map((c) => [c.id, c] as const),
);

/** alias → entityId。重复 alias 会保留最后一次（应在 JSON 校验中避免）。 */
export const aliasToEntity: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const e of RAW.entities) {
    for (const a of e.aliases) m.set(a, e.id);
  }
  return m;
})();

/** label → conceptIds（单 label 可命中多个 concept） */
export const labelToConcepts: ReadonlyMap<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const c of RAW.concepts) {
    for (const l of c.labels) {
      const arr = m.get(l) ?? [];
      arr.push(c.id);
      m.set(l, arr);
    }
  }
  return m;
})();

/**
 * 按 alias 长度倒序排（贪心匹配「玫瑰」前优先匹配「那朵花」）。
 * 用于 Step 3 的剧透扫描 / Step 4 的 retrieval。
 */
export const aliasesSortedByLength: readonly string[] = Array.from(
  aliasToEntity.keys(),
).sort((a, b) => b.length - a.length);

export const labelsSortedByLength: readonly string[] = Array.from(
  labelToConcepts.keys(),
).sort((a, b) => b.length - a.length);

/**
 * 返回段落在全书中的序号（0-based）。
 * 未知 id 返回 -1（调用方决定如何处理）。
 */
export function paragraphOrdinal(paragraphId: string | null): number {
  if (!paragraphId) return -1;
  return paragraphOrderIndex.get(paragraphId) ?? -1;
}

/**
 * 比较两个段落 id 的先后：返回正数 = a 在 b 之后，0 = 同位，负数 = a 在 b 之前。
 * 任一未知段落 id 视为「最早」（-Infinity），调用方需自行处理 NaN 风险。
 */
export function compareParagraphs(a: string, b: string): number {
  const oa = paragraphOrderIndex.get(a) ?? -1;
  const ob = paragraphOrderIndex.get(b) ?? -1;
  return oa - ob;
}

/**
 * 检查"用户当前 anchor" 是否已经读到了 revealAfterParagraphId 那段（含）。
 * 用于 spoiler 判定与 sweepPendingReadiness。
 *
 * - anchor === null：视为「未开始读」，永远 false
 * - anchor 未知：视为「未开始读」，返回 false
 * - revealAfter 未知：保守视为 false（不揭晓 > 错揭晓）
 */
export function hasReadThrough(
  anchor: string | null,
  revealAfterParagraphId: string,
): boolean {
  if (!anchor) return false;
  const oa = paragraphOrderIndex.get(anchor) ?? -1;
  const or = paragraphOrderIndex.get(revealAfterParagraphId) ?? Infinity;
  if (oa < 0) return false;
  return oa >= or;
}

/**
 * 给定段落 id 反推章节编号（1-based）。`sample-content.ts` 段落 id 形如 `p-c<N>-<M>`。
 * 找不到时返回 1（保守值），调用方可决定 fallback。
 */
export function chapterNumberFromParagraphId(paragraphId: string): number {
  const m = /^p-c(\d+)-/.exec(paragraphId);
  if (!m) return 1;
  return Number.parseInt(m[1], 10);
}
