/**
 * 阅读地图节点合并器（成员 2 维护）。
 *
 * 节点来源（三股）：
 *   1. 静态种子    —— 来自 little-prince.json 的 mapSeeds（character / theme / bookmark）
 *   2. 多模态种子  —— map-data.ts RAW_NODES 中 type=image / bgm 的节点（成员 3 领地，透传不改）
 *   3. 动态层     —— 用户当次会话产生的 chatMessages（dialogue）与 pendingQuestions（pending）
 *
 * 输出顺序：与现有实现保持一致，按 timestamp 倒序（最近的在上）。
 *
 * 与 `app/lib/mock/map-data.ts` 的关系：
 *   - 后者保留 RAW_NODES 数据并继续对外导出，
 *   - 但 `getMapNodesForBook(bookId)` 通过本模块的 `getAiMapNodes` 派生最终列表。
 */

import {
  conceptById,
  entityById,
  chapterNumberFromParagraphId,
} from "@/app/lib/ai/data/littlePrince";
import type {
  PreprocessedMapSeed,
} from "@/app/lib/ai/data/schema";
import { littlePrince, LITTLE_PRINCE_BOOK_ID } from "@/app/lib/ai/data/littlePrince";
import type {
  MapFilterTab,
  MapNode,
  MapNodePayload,
  MapNodeType,
} from "@/app/lib/mock/map-data";
import type { ChatMessage, PendingQuestion } from "@/app/lib/mock/chat";

/**
 * 给一个 paragraphId 反推 chapterIndex（0-based）。
 * map node 的 chapterIndex 是 0-based（current/章节标签用）。
 */
function chapterIndexOf(paragraphId: string): number {
  return Math.max(0, chapterNumberFromParagraphId(paragraphId) - 1);
}

function seedToMapNode(
  seed: PreprocessedMapSeed,
  index: number,
  demoNow: Date,
): MapNode {
  // 让种子按段落顺序错开时间戳，越靠前的段落时间越早，
  // 这样在按时间倒序的 UI 中，与现有 RAW_NODES 节奏接近。
  const tsOffsetHours = 70 - index * 2;
  const timestamp = new Date(demoNow.getTime() - tsOffsetHours * 3600_000);

  let type: MapNodeType;
  let payload: MapNodePayload;
  if (seed.kind === "character") {
    const entity = seed.entityId ? entityById.get(seed.entityId) : undefined;
    type = "character";
    payload = {
      title: seed.title,
      preview: seed.preview,
      characterName: entity?.aliases[0],
    };
  } else if (seed.kind === "theme") {
    const concept = seed.conceptId ? conceptById.get(seed.conceptId) : undefined;
    type = "dialogue";
    payload = {
      title: seed.title ?? (concept ? `主题 · ${concept.labels[0]}` : "主题"),
      preview: seed.preview,
    };
  } else {
    type = "bookmark";
    payload = {
      title: seed.title,
      preview: seed.preview,
    };
  }

  return {
    id: `seed-${seed.kind}-${seed.entityId ?? seed.conceptId ?? "bookmark"}-${seed.paragraphId}`,
    paragraphId: seed.paragraphId,
    chapterIndex: chapterIndexOf(seed.paragraphId),
    type,
    timestamp,
    payload,
  };
}

function chatToMapNode(msg: ChatMessage, demoNow: Date): MapNode | null {
  if (msg.role !== "ai" || msg.type === "spoiler-blocked") return null;
  // 只把有 paragraphId 上下文的回答合并，避免无锚点节点漂浮
  const pid =
    msg.citations?.[0]?.paragraphId ?? null;
  if (!pid) return null;
  return {
    id: `chat-${msg.id}`,
    paragraphId: pid,
    chapterIndex: chapterIndexOf(pid),
    type: "dialogue",
    timestamp: msg.createdAt ? new Date(msg.createdAt) : demoNow,
    payload: {
      title: msg.type === "pending-release" ? "与 AI · 揭晓" : "与 AI · 对话",
      preview: truncate(msg.content, 60),
    },
  };
}

function pendingToMapNode(
  q: PendingQuestion,
  demoNow: Date,
  idx: number,
): MapNode | null {
  const pid = q.revealAfterParagraphId ?? q.paragraphId;
  if (!pid) return null;
  return {
    id: `pending-${q.id}`,
    paragraphId: pid,
    chapterIndex: chapterIndexOf(pid),
    type: "pending",
    timestamp: new Date(demoNow.getTime() - idx * 60_000),
    payload: {
      title: "悬念",
      pendingQuestion: q.userQuestion,
      pendingStatus: q.status === "ready" ? "ready" : "waiting",
      preview:
        q.status === "ready"
          ? "答案已就绪，长按本节点或回到对话查看。"
          : "已加入悬念队列，到达揭晓点后会高亮。",
    },
  };
}

function bookmarkToMapNode(b: {
  paragraphId: string;
  chapterIndex: number;
  createdAt: number;
}): MapNode {
  return {
    id: `bookmark-${b.paragraphId}-${b.createdAt}`,
    paragraphId: b.paragraphId,
    chapterIndex: b.chapterIndex,
    type: "bookmark",
    timestamp: new Date(b.createdAt),
    payload: {
      title: "标记",
      preview: "你给这段画了个记号；点按回到此处。",
    },
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export interface MapNodesOptions {
  /** 透传：map-data.ts RAW_NODES 里的多模态节点（image/bgm） */
  passthroughMultimodalNodes?: MapNode[];
  chatMessages?: ChatMessage[];
  pendingQuestions?: PendingQuestion[];
  runtimeBookmarks?: {
    paragraphId: string;
    chapterIndex: number;
    createdAt: number;
  }[];
  demoNow?: Date;
}

/**
 * 返回某书的最终地图节点列表（已排序）。
 * 非《小王子》调用 → 只返回透传的多模态节点（其它书暂未上架）。
 */
export function getAiMapNodes(
  bookId: string,
  opts: MapNodesOptions = {},
): MapNode[] {
  const demoNow = opts.demoNow ?? new Date();
  const out: MapNode[] = [];

  if (bookId === LITTLE_PRINCE_BOOK_ID) {
    for (let i = 0; i < littlePrince.mapSeeds.length; i += 1) {
      out.push(seedToMapNode(littlePrince.mapSeeds[i], i, demoNow));
    }
  }

  if (opts.passthroughMultimodalNodes) {
    out.push(...opts.passthroughMultimodalNodes);
  }

  if (opts.chatMessages) {
    for (const m of opts.chatMessages) {
      const n = chatToMapNode(m, demoNow);
      if (n) out.push(n);
    }
  }
  if (opts.pendingQuestions) {
    for (let i = 0; i < opts.pendingQuestions.length; i += 1) {
      const n = pendingToMapNode(opts.pendingQuestions[i], demoNow, i);
      if (n) out.push(n);
    }
  }
  if (opts.runtimeBookmarks) {
    for (const b of opts.runtimeBookmarks) {
      out.push(bookmarkToMapNode(b));
    }
  }

  out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return out;
}

export type { MapFilterTab };
