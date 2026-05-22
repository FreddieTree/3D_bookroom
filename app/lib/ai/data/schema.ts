/**
 * 预处理产物的 TypeScript 类型定义（成员 2 维护）。
 *
 * 单一书目对应一个 `PreprocessedBook` JSON，落在
 * `app/lib/data/preprocessed/<book-id>.json`。
 *
 * 第一版（《小王子》）由人工填写；后续可由 `scripts/build-preprocessed.ts` 半自动生成。
 *
 * Schema 校验：开发模式下 `littlePrince.ts` 加载时调 `assertValidPreprocessedBook`，
 * 任何字段缺失 / 段落 id 漏写都会立刻 throw（早发现 > 默默错答）。
 */

export interface PreprocessedConcept {
  /** 概念 id，stable，会出现在 `AiAnswer.conceptId` 中。Step 4 起强类型化。 */
  id: string;
  /** 用户问题命中本概念的关键词（含同义/口语） */
  labels: string[];
  /** 概念在书里的关键锚点段落 id（用作引用） */
  anchors: string[];
  /**
   * 「完整理解所需」的最早段落 id：用户进度未到此处时，被剧透判定为 defer。
   * Step 1-2 阶段允许缺省（不参与剧透判定）；Step 3 起必填。
   */
  revealAfterParagraphId?: string;
  /** 2-3 个语言变体的回答模板。复用旧 4 模板时填入对应 concept。 */
  templates: string[];
  /** 「卖关子」线索，剧透 defer 时挑一句给用户 */
  teasers: string[];
}

export interface PreprocessedEntity {
  id: string;
  aliases: string[];
  firstAppearParagraphId: string;
  /** 用户进度未到此处时，被剧透判定为 defer */
  revealAfterParagraphId: string;
  /** 与该实体强相关的概念，命中实体时 retrieval 用作 boost */
  conceptIds: string[];
}

export interface PreprocessedSpoilerCircle {
  id: string;
  startParagraphId: string;
  endParagraphId: string;
  topics: string[];
}

export type MapSeedKind = "character" | "theme" | "bookmark";

export interface PreprocessedMapSeed {
  kind: MapSeedKind;
  paragraphId: string;
  /** kind === "character" 时必填 */
  entityId?: string;
  /** kind === "theme" 时必填 */
  conceptId?: string;
  /** 节点显示标题（可选；缺省时由 mapNodes 模块按 kind 推断） */
  title?: string;
  /** 节点显示摘要（可选） */
  preview?: string;
}

export interface PreprocessedBook {
  bookId: string;
  /** 数据格式版本，与 `app/lib/ai/data/littlePrince.ts` 的解析逻辑配对 */
  version: number;
  totalParagraphs: number;
  /** 全书段落 id 的全序，用作剧透判定中的 O(1) 比较 */
  paragraphOrder: string[];
  concepts: PreprocessedConcept[];
  entities: PreprocessedEntity[];
  spoilerCircles: PreprocessedSpoilerCircle[];
  mapSeeds: PreprocessedMapSeed[];
}

/**
 * 手工校验函数。当某个段落 id 写错时立刻在加载阶段 throw，避免运行时静默漏答。
 * 这里不引入 zod，以免动 bundle 大小。
 */
export function assertValidPreprocessedBook(data: PreprocessedBook): void {
  const orderSet = new Set(data.paragraphOrder);
  if (data.paragraphOrder.length !== data.totalParagraphs) {
    throw new Error(
      `[preprocessed:${data.bookId}] totalParagraphs(${data.totalParagraphs}) !== paragraphOrder.length(${data.paragraphOrder.length})`,
    );
  }
  if (orderSet.size !== data.paragraphOrder.length) {
    throw new Error(
      `[preprocessed:${data.bookId}] paragraphOrder 有重复 id`,
    );
  }
  const check = (id: string, where: string) => {
    if (!orderSet.has(id)) {
      throw new Error(
        `[preprocessed:${data.bookId}] ${where} 引用了未知段落 id "${id}"`,
      );
    }
  };
  for (const c of data.concepts) {
    for (const a of c.anchors) check(a, `concept(${c.id}).anchors`);
    if (c.revealAfterParagraphId) {
      check(c.revealAfterParagraphId, `concept(${c.id}).revealAfterParagraphId`);
    }
    if (c.templates.length === 0) {
      throw new Error(
        `[preprocessed:${data.bookId}] concept(${c.id}) 必须至少有一个 template`,
      );
    }
  }
  for (const e of data.entities) {
    check(e.firstAppearParagraphId, `entity(${e.id}).firstAppearParagraphId`);
    check(e.revealAfterParagraphId, `entity(${e.id}).revealAfterParagraphId`);
  }
  for (const s of data.spoilerCircles) {
    check(s.startParagraphId, `spoilerCircle(${s.id}).startParagraphId`);
    check(s.endParagraphId, `spoilerCircle(${s.id}).endParagraphId`);
  }
  for (const m of data.mapSeeds) {
    check(m.paragraphId, `mapSeed.paragraphId`);
    if (m.kind === "character" && !m.entityId) {
      throw new Error(
        `[preprocessed:${data.bookId}] mapSeed(kind=character) 必须有 entityId`,
      );
    }
    if (m.kind === "theme" && !m.conceptId) {
      throw new Error(
        `[preprocessed:${data.bookId}] mapSeed(kind=theme) 必须有 conceptId`,
      );
    }
  }
}
