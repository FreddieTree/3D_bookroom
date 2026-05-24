/**
 * 将地图节点锚定到真实 body 章节数组（fetchMergedBookChapters / API 顺序）。
 */
import type { ChapterContent } from "@/app/lib/data/sample-content";
import {
  MAP_DEMO_NOW,
  type MapNode,
  type MapNodeType,
} from "@/app/lib/mock/map-data";

const DECOR_TYPES = new Set<MapNodeType>([
  "image",
  "dialogue",
  "character",
  "pending",
  "bookmark",
  "bgm",
]);

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 每章一个章节锚点，铺满塔楼 segment。 */
export function buildChapterAnchorNodes(
  chapters: ChapterContent[],
  demoNow: Date = MAP_DEMO_NOW,
): MapNode[] {
  const n = chapters.length;
  return chapters.map((ch, chi) => {
    const firstPid =
      ch.paragraphs[0]?.id ?? `${ch.bookId}:ch-${chi}:anchor`;
    return {
      id: `map-ch-anchor-${ch.bookId}-${chi}`,
      paragraphId: firstPid,
      chapterIndex: chi,
      type: "chapter",
      timestamp: new Date(demoNow.getTime() - (n - chi) * 7200_000),
      payload: {
        title: ch.title?.trim() || `第 ${chi + 1} 章`,
        preview: "章节入口 · 点按从本章开头阅读",
      },
    };
  });
}

/**
 * 把 mock / AI 派生的装饰球按序散布到真实章节，并重写 paragraphId。
 */
export function remapDecorNodesToBodyChapters(
  nodes: MapNode[],
  chapters: ChapterContent[],
): MapNode[] {
  const chLen = chapters.length;
  if (chLen === 0) return [];

  const decor = nodes.filter(
    (n) =>
      n.type !== "current" &&
      n.type !== "chapter" &&
      DECOR_TYPES.has(n.type),
  );

  const sorted = [...decor].sort((a, b) => {
    if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
    return a.id.localeCompare(b.id);
  });

  const count = sorted.length;
  return sorted.map((node, i) => {
    const chIdx = Math.min(
      chLen - 1,
      Math.floor((i / Math.max(1, count)) * chLen),
    );
    const ch = chapters[chIdx]!;
    const paras = ch.paragraphs;
    const paraIdx =
      paras.length > 0 ? stableHash(node.id) % paras.length : 0;
    const pid =
      paras[paraIdx]?.id ?? paras[0]?.id ?? `${ch.bookId}:ch-${chIdx}:anchor`;

    return {
      ...node,
      chapterIndex: chIdx,
      paragraphId: pid,
    };
  });
}

export function buildResolvedMapNodes(
  chapters: ChapterContent[],
  rawNodes: MapNode[],
): MapNode[] {
  if (chapters.length === 0) return [];
  const anchors = buildChapterAnchorNodes(chapters);
  const remapped = remapDecorNodesToBodyChapters(rawNodes, chapters);
  return [...anchors, ...remapped];
}

/** 跳转前解析安全章节下标与段落 id。 */
export function resolveMapJumpTarget(
  chapters: ChapterContent[],
  paragraphId: string,
  chapterIndex: number,
): { chapterIndex: number; paragraphId: string } {
  if (chapters.length === 0) {
    return { chapterIndex: 0, paragraphId: paragraphId.trim() };
  }

  const pid = paragraphId.trim();
  const byPara = pid
    ? chapters.findIndex((ch) => ch.paragraphs.some((p) => p.id === pid))
    : -1;

  const safeIdx =
    byPara >= 0
      ? byPara
      : Math.min(
          Math.max(0, Math.floor(chapterIndex)),
          chapters.length - 1,
        );

  const ch = chapters[safeIdx];
  let resolvedPid = pid;
  if (!ch?.paragraphs.some((p) => p.id === resolvedPid)) {
    resolvedPid = ch?.paragraphs[0]?.id ?? resolvedPid;
  }

  return { chapterIndex: safeIdx, paragraphId: resolvedPid };
}
