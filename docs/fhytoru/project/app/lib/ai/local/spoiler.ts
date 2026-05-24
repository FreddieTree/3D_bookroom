/**
 * 精确剧透判定（成员 2 维护）。
 *
 * 算法（参见 docs/member-2-ai/README.md §3）：
 *   1. 在用户问题中扫描所有命中的 entity alias 与 concept label
 *   2. 若命中实体的 `revealAfterParagraphId` 在用户 anchor 之后 → DEFER
 *   3. 否则若命中概念的 `revealAfterParagraphId` 在用户 anchor 之后 → DEFER
 *   4. 兜底：用户用强追问词但没命中任何实体 → SOFT_DEFER（保留旧行为）
 *   5. 其它 → OK
 *
 * 非《小王子》调用 → 退回旧关键词判定（mock/chat.ts facade），保证演示不退化。
 */

import {
  aliasToEntity,
  aliasesSortedByLength,
  chapterNumberFromParagraphId,
  conceptById,
  entityById,
  hasReadThrough,
  labelToConcepts,
  labelsSortedByLength,
  LITTLE_PRINCE_BOOK_ID,
} from "@/app/lib/ai/data/littlePrince";
import {
  legacyShouldDeferAsSpoiler,
  legacySpoilerQueueCopy,
  LEGACY_REVEAL_CHAPTER,
} from "@/app/lib/ai/local/legacyAdapter";
import type { AiContext, SpoilerVerdict } from "@/app/lib/ai/types";

interface ScanHit {
  /** 命中的字面词 */
  surface: string;
  /** entity 或 concept id */
  id: string;
  kind: "entity" | "concept";
}

function scanQuestion(text: string): ScanHit[] {
  const hits: ScanHit[] = [];
  const seenEntity = new Set<string>();
  const seenConcept = new Set<string>();

  for (const alias of aliasesSortedByLength) {
    if (text.includes(alias)) {
      const eid = aliasToEntity.get(alias);
      if (eid && !seenEntity.has(eid)) {
        seenEntity.add(eid);
        hits.push({ surface: alias, id: eid, kind: "entity" });
      }
    }
  }
  for (const label of labelsSortedByLength) {
    if (text.includes(label)) {
      const cids = labelToConcepts.get(label) ?? [];
      for (const cid of cids) {
        if (!seenConcept.has(cid)) {
          seenConcept.add(cid);
          hits.push({ surface: label, id: cid, kind: "concept" });
        }
      }
    }
  }
  return hits;
}

function spoilerCopyForEntity(entityId: string, revealParagraphId: string): string {
  const ch = chapterNumberFromParagraphId(revealParagraphId);
  const entity = entityById.get(entityId);
  const subject = entity?.aliases[0] ?? "这个谜底";
  return `关于「${subject}」的完整答案在后面才会显形。我先把这个问题收进悬念队列，你读到第 ${ch} 章相关段落时，我会主动揭晓。`;
}

function spoilerCopyForConcept(conceptId: string, revealParagraphId: string): string {
  const ch = chapterNumberFromParagraphId(revealParagraphId);
  const concept = conceptById.get(conceptId);
  const subject = concept?.labels[0] ?? "这个概念";
  return `关于「${subject}」，故事在后面才会把它讲完整。我把这个问题暂存，等你读到第 ${ch} 章再揭晓。`;
}

/**
 * 主入口。对《小王子》使用精确算法，其它书回退到旧关键词判定。
 */
export function judgeSpoilerForBook(
  text: string,
  ctx: AiContext,
): SpoilerVerdict {
  if (ctx.bookId !== LITTLE_PRINCE_BOOK_ID) {
    if (!legacyShouldDeferAsSpoiler(text)) return { kind: "ok" };
    return {
      kind: "soft-defer",
      revealAfterChapter: LEGACY_REVEAL_CHAPTER,
      spoilerCopy: legacySpoilerQueueCopy(LEGACY_REVEAL_CHAPTER),
    };
  }

  const trimmed = text.trim();
  if (trimmed.length < 2) return { kind: "ok" };

  const hits = scanQuestion(trimmed);

  for (const h of hits) {
    if (h.kind !== "entity") continue;
    const entity = entityById.get(h.id);
    if (!entity) continue;
    if (hasReadThrough(ctx.paragraphId, entity.revealAfterParagraphId)) continue;
    return {
      kind: "defer",
      revealAfterParagraphId: entity.revealAfterParagraphId,
      revealAfterChapter: chapterNumberFromParagraphId(
        entity.revealAfterParagraphId,
      ),
      matchedEntity: entity.id,
      reason: `命中实体 ${entity.id}（alias=${h.surface}），需读到 ${entity.revealAfterParagraphId} 后才能揭晓`,
      spoilerCopy: spoilerCopyForEntity(entity.id, entity.revealAfterParagraphId),
    };
  }

  for (const h of hits) {
    if (h.kind !== "concept") continue;
    const concept = conceptById.get(h.id);
    if (!concept?.revealAfterParagraphId) continue;
    if (hasReadThrough(ctx.paragraphId, concept.revealAfterParagraphId)) continue;
    return {
      kind: "defer",
      revealAfterParagraphId: concept.revealAfterParagraphId,
      revealAfterChapter: chapterNumberFromParagraphId(
        concept.revealAfterParagraphId,
      ),
      matchedEntity: concept.id,
      reason: `命中概念 ${concept.id}（label=${h.surface}），需读到 ${concept.revealAfterParagraphId} 后才能揭晓`,
      spoilerCopy: spoilerCopyForConcept(
        concept.id,
        concept.revealAfterParagraphId,
      ),
    };
  }

  return { kind: "ok" };
}
