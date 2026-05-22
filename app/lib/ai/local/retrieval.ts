/**
 * 段落级检索（成员 2 维护）。
 *
 * 输入：用户提问 + 当前 anchor。
 * 输出：被命中的 concept / entity 列表 + 评分排序后的候选段落。
 *
 * 评分（每段独立打分，最后取 topK）：
 *   score = 0.55 * termHit        — 用户提问字面词在段落里的命中次数（归一化）
 *         + 0.30 * conceptOverlap — 段落是否在某个命中 concept 的 anchors 里
 *         + 0.10 * entityHit      — 段落是否包含命中实体的 alias
 *         + 0.05 * anchorProximity— 与用户当前 anchor 的接近度（±2 段加分）
 *
 * 实现保持「无依赖」：不引 jieba / embedding。中文按 1-3 字 n-gram 命中，
 * 对手工标注的语料够用。
 */

import {
  aliasToEntity,
  aliasesSortedByLength,
  conceptById,
  entityById,
  labelToConcepts,
  labelsSortedByLength,
  paragraphOrdinal,
} from "@/app/lib/ai/data/littlePrince";
import { getChaptersForBook } from "@/app/lib/data/sample-content";

export interface ScanResult {
  conceptIds: string[];
  entityIds: string[];
  /** 字面命中的 surface 词，用于解释性日志 */
  surfaces: string[];
}

export function scanQuery(text: string): ScanResult {
  const conceptIds: string[] = [];
  const entityIds: string[] = [];
  const surfaces: string[] = [];
  const seenC = new Set<string>();
  const seenE = new Set<string>();

  for (const alias of aliasesSortedByLength) {
    if (text.includes(alias)) {
      const eid = aliasToEntity.get(alias);
      if (eid && !seenE.has(eid)) {
        seenE.add(eid);
        entityIds.push(eid);
        surfaces.push(alias);
      }
    }
  }
  for (const label of labelsSortedByLength) {
    if (text.includes(label)) {
      for (const cid of labelToConcepts.get(label) ?? []) {
        if (!seenC.has(cid)) {
          seenC.add(cid);
          conceptIds.push(cid);
          surfaces.push(label);
        }
      }
    }
  }

  // 通过 entity 关联的 concept 一并补入（弱权重，附在末尾）
  for (const eid of entityIds) {
    const ent = entityById.get(eid);
    if (!ent) continue;
    for (const cid of ent.conceptIds) {
      if (!seenC.has(cid)) {
        seenC.add(cid);
        conceptIds.push(cid);
      }
    }
  }

  return { conceptIds, entityIds, surfaces };
}

export interface ScoredParagraph {
  paragraphId: string;
  text: string;
  chapterIndex: number;
  score: number;
}

interface InternalParagraph {
  id: string;
  text: string;
  chapterIndex: number;
}

function flattenChapters(bookId: string): InternalParagraph[] {
  const chapters = getChaptersForBook(bookId);
  if (!chapters) return [];
  const out: InternalParagraph[] = [];
  for (const ch of chapters) {
    for (const p of ch.paragraphs) {
      out.push({ id: p.id, text: p.text, chapterIndex: ch.index });
    }
  }
  return out;
}

const corpusCache = new Map<string, InternalParagraph[]>();

function getCorpus(bookId: string): InternalParagraph[] {
  let c = corpusCache.get(bookId);
  if (!c) {
    c = flattenChapters(bookId);
    corpusCache.set(bookId, c);
  }
  return c;
}

const STOP_WORDS = new Set([
  "什么", "怎么", "为什么", "为何", "是否", "是不是", "可以", "不能",
  "他们", "我们", "你们", "他", "她", "它", "的", "了", "在", "和",
  "与", "也", "都", "请", "帮", "我", "你", "这", "那", "里", "中",
  "上", "下", "啊", "呢", "吗", "吧", "啦", "啦", "嗯", "哦",
]);

/**
 * 提取查询里有实义的 n-gram 词组。
 * 长度 2-4，去停用词，去纯标点。
 */
export function extractQueryTerms(text: string): string[] {
  const cleaned = text.replace(/[，。！？、；：""''《》（）()【】.,!?;:"'<>\[\]\s]+/g, "");
  const terms = new Set<string>();
  for (let len = 4; len >= 2; len -= 1) {
    for (let i = 0; i + len <= cleaned.length; i += 1) {
      const slice = cleaned.slice(i, i + len);
      if (STOP_WORDS.has(slice)) continue;
      terms.add(slice);
    }
  }
  return Array.from(terms);
}

export interface ScoreOptions {
  bookId: string;
  query: string;
  anchorParagraphId: string | null;
  conceptIds: string[];
  entityIds: string[];
}

export function scoreParagraphs(opts: ScoreOptions): ScoredParagraph[] {
  const corpus = getCorpus(opts.bookId);
  if (corpus.length === 0) return [];

  const queryTerms = extractQueryTerms(opts.query);
  const conceptAnchorSet = new Set<string>();
  for (const cid of opts.conceptIds) {
    const c = conceptById.get(cid);
    if (!c) continue;
    for (const a of c.anchors) conceptAnchorSet.add(a);
  }
  const entityAliasList: string[] = [];
  for (const eid of opts.entityIds) {
    const e = entityById.get(eid);
    if (!e) continue;
    for (const a of e.aliases) entityAliasList.push(a);
  }
  const anchorOrdinal = paragraphOrdinal(opts.anchorParagraphId);

  const scored: ScoredParagraph[] = corpus.map((p) => {
    let termHit = 0;
    for (const t of queryTerms) {
      if (p.text.includes(t)) termHit += 1;
    }
    const termHitNorm = queryTerms.length > 0 ? termHit / queryTerms.length : 0;
    const conceptOverlap = conceptAnchorSet.has(p.id) ? 1 : 0;
    const entityHit = entityAliasList.some((a) => p.text.includes(a)) ? 1 : 0;

    let anchorProximity = 0;
    if (anchorOrdinal >= 0) {
      const po = paragraphOrdinal(p.id);
      if (po >= 0) {
        const dist = Math.abs(po - anchorOrdinal);
        if (dist <= 2) anchorProximity = 1;
        else if (dist <= 5) anchorProximity = 0.4;
      }
    }

    const score =
      0.55 * termHitNorm +
      0.30 * conceptOverlap +
      0.10 * entityHit +
      0.05 * anchorProximity;

    return {
      paragraphId: p.id,
      text: p.text,
      chapterIndex: p.chapterIndex,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0);
}

/**
 * 取 top-K 段落（默认 3）。
 */
export function topKParagraphs(
  scored: ScoredParagraph[],
  k = 3,
): ScoredParagraph[] {
  return scored.slice(0, k);
}
