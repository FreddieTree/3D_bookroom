/**
 * 端到端用例脚本（docs/member-2-ai/README.md §8.2）。
 * 不走 UI，直接调用真实的 LocalAiProvider + 复刻 store sweep 逻辑，
 * 验证 6 条预期行为。
 *
 * 用法：npx tsx scripts/e2e-spoiler-queue.mts
 */

import { LocalAiProvider } from "../app/lib/ai/local/index.ts";
import { hasReadThrough, chapterNumberFromParagraphId } from "../app/lib/ai/data/littlePrince.ts";
import type {
  AiContext,
  PendingQuestion,
  SpoilerVerdict,
} from "../app/lib/ai/types.ts";

const BOOK_ID = "little-prince";

const provider = new LocalAiProvider();

/** 复刻 appStore.sendChatMessage 的状态机部分（不含 streaming 副作用） */
function simulateSend(
  question: string,
  ctx: AiContext,
  queue: PendingQuestion[],
): { verdict: SpoilerVerdict; queue: PendingQuestion[]; aiText?: string } {
  const verdict = provider.judgeSpoiler(question, ctx);
  if (verdict.kind !== "ok") {
    const revealParagraph = verdict.revealAfterParagraphId;
    const revealChapter =
      verdict.revealAfterChapter ??
      (revealParagraph ? chapterNumberFromParagraphId(revealParagraph) : 3);
    const initialStatus: PendingQuestion["status"] =
      revealParagraph && hasReadThrough(ctx.paragraphId, revealParagraph)
        ? "ready"
        : "pending";
    const pending: PendingQuestion = {
      id: `q-${queue.length + 1}`,
      userQuestion: question,
      paragraphId: ctx.paragraphId,
      revealAfterChapter: revealChapter,
      revealAfterParagraphId: revealParagraph,
      status: initialStatus,
      matchedEntity: verdict.matchedEntity,
    };
    return { verdict, queue: [...queue, pending] };
  }
  return { verdict, queue };
}

/** 复刻 setReadingAnchor 中的 sweep 子句 */
function sweepQueue(
  queue: PendingQuestion[],
  anchor: string | null,
): PendingQuestion[] {
  return queue.map((q) => {
    if (q.status === "ready" || !q.revealAfterParagraphId) return q;
    return hasReadThrough(anchor, q.revealAfterParagraphId)
      ? { ...q, status: "ready" as const }
      : q;
  });
}

function fmtVerdict(v: SpoilerVerdict): string {
  return JSON.stringify(
    {
      kind: v.kind,
      revealAfterChapter: v.revealAfterChapter,
      revealAfterParagraphId: v.revealAfterParagraphId,
      matchedEntity: v.matchedEntity,
    },
    null,
    0,
  );
}

const lines: string[] = [];
function log(s: string) {
  lines.push(s);
}

function assert(name: string, cond: boolean, detail?: string) {
  const sign = cond ? "✅" : "❌";
  log(`  ${sign} ${name}${detail ? `  · ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
}

let queue: PendingQuestion[] = [];

// ───────────────────────────────────────────────────────────────
log("=== 用例 1: anchor=p-c1-3, 问『狐狸是谁？』 ===");
{
  const ctx: AiContext = { bookId: BOOK_ID, chapterIndex: 0, paragraphId: "p-c1-3" };
  const r = simulateSend("狐狸是谁？", ctx, queue);
  queue = r.queue;
  log(`  verdict = ${fmtVerdict(r.verdict)}`);
  log(`  spoilerCopy = ${r.verdict.spoilerCopy}`);
  assert("verdict.kind === defer", r.verdict.kind === "defer");
  assert("matchedEntity === fox", r.verdict.matchedEntity === "fox");
  assert("revealAfterChapter === 3", r.verdict.revealAfterChapter === 3);
  assert("入队 1 条", queue.length === 1);
  assert("queue[0].status === pending", queue[0]?.status === "pending");
  assert(
    "spoilerCopy 包含『第 3 章』",
    !!r.verdict.spoilerCopy?.includes("第 3 章"),
  );
}

// ───────────────────────────────────────────────────────────────
log("\n=== 用例 2: 推进 anchor 到 p-c3-9，sweep 后 queue[0].status 期望 === ready ===");
{
  queue = sweepQueue(queue, "p-c3-9");
  log(`  queue[0].status = ${queue[0]?.status}`);
  assert("queue[0].status === ready", queue[0]?.status === "ready");
  assert("仍是 1 条（红点视觉不变）", queue.length === 1);
}

// ───────────────────────────────────────────────────────────────
log("\n=== 用例 3: 点红点 -> releasePending（composeReleaseAnswer），引用应含 c3-8 / c3-9 ===");
{
  const ctx: AiContext = { bookId: BOOK_ID, chapterIndex: 2, paragraphId: "p-c3-9" };
  const pending = queue[0];
  const ans = provider.composeReleaseAnswer(pending, ctx);
  log(`  text 头部 = ${ans.text.slice(0, 60)}…`);
  log(`  conceptId = ${ans.conceptId}`);
  log(`  citations = ${ans.citations.map((c) => c.paragraphId).join(", ")}`);
  const ids = ans.citations.map((c) => c.paragraphId);
  assert("text 以『还记得你问的』开头（揭晓卡口吻）", ans.text.startsWith("还记得你问的"));
  assert("conceptId 命中 fox-meeting/taming/responsibility 之一",
    ["fox-meeting", "taming", "responsibility"].includes(ans.conceptId ?? ""));
  assert(
    "citations 至少含 c3-8 或 c3-9 之一",
    ids.includes("p-c3-8") || ids.includes("p-c3-9"),
    `实际 = ${ids.join(",")}`,
  );
  queue = queue.slice(1); // 出队
  assert("出队后队列为空", queue.length === 0);
}

// ───────────────────────────────────────────────────────────────
log("\n=== 用例 4: anchor=p-c2-5, 问『驯养是什么意思』-> spoiler-blocked, teaser 第 3 章 ===");
{
  const ctx: AiContext = { bookId: BOOK_ID, chapterIndex: 1, paragraphId: "p-c2-5" };
  const r = simulateSend("驯养是什么意思", ctx, queue);
  queue = r.queue;
  log(`  verdict = ${fmtVerdict(r.verdict)}`);
  log(`  spoilerCopy = ${r.verdict.spoilerCopy}`);
  assert("verdict.kind === defer", r.verdict.kind === "defer");
  assert(
    "matchedEntity 命中 taming",
    r.verdict.matchedEntity === "taming",
    `实际 = ${r.verdict.matchedEntity}`,
  );
  assert("revealAfterChapter === 3", r.verdict.revealAfterChapter === 3);
  assert(
    "spoilerCopy 提到第 3 章揭晓",
    !!r.verdict.spoilerCopy?.includes("第 3 章"),
  );
}

// ───────────────────────────────────────────────────────────────
log("\n=== 用例 5: anchor=p-c3-9, 问『驯养是什么意思』-> ok, conceptId=taming, citations 含 c2-4/c3-8/c3-9 ===");
{
  const ctx: AiContext = { bookId: BOOK_ID, chapterIndex: 2, paragraphId: "p-c3-9" };
  const v = provider.judgeSpoiler("驯养是什么意思", ctx);
  log(`  verdict = ${fmtVerdict(v)}`);
  assert("verdict.kind === ok", v.kind === "ok");
  if (v.kind === "ok") {
    let captured = "";
    const ans = await provider.streamAsk(
      "驯养是什么意思",
      ctx,
      (p) => (captured = p),
    );
    const ids = ans.citations.map((c) => c.paragraphId);
    log(`  conceptId = ${ans.conceptId}`);
    log(`  citations = ${ids.join(", ")}`);
    log(`  text 头 = ${ans.text.slice(0, 60)}…`);
    log(`  streamed 字符数 = ${captured.length}`);
    assert("conceptId === taming", ans.conceptId === "taming");
    const wanted = ["p-c2-4", "p-c3-8", "p-c3-9"];
    const hit = wanted.filter((id) => ids.includes(id));
    assert(
      "citations 至少命中 c2-4 / c3-8 / c3-9 中 2 条",
      hit.length >= 2,
      `命中 = ${hit.join(",")} | 全部 = ${ids.join(",")}`,
    );
  }
}

// ───────────────────────────────────────────────────────────────
log("\n=== 用例 6: 『玫瑰是什么颜色的』-> 是否 defer 取决于 anchor 是否跨过 p-c3-7 ===");
{
  // 6a：anchor=p-c3-6（未跨过 rose 实体的 revealAfterParagraphId=p-c3-8）
  const ctxA: AiContext = { bookId: BOOK_ID, chapterIndex: 2, paragraphId: "p-c3-6" };
  const vA = provider.judgeSpoiler("玫瑰是什么颜色的", ctxA);
  log(`  6a anchor=p-c3-6  verdict = ${fmtVerdict(vA)}`);
  assert("6a defer（rose entity 未读到）", vA.kind === "defer");
  assert(
    "6a matchedEntity 命中 rose 相关",
    vA.matchedEntity === "rose" ||
      vA.matchedEntity === "rose-uniqueness" ||
      vA.matchedEntity === "taming",
    `实际 = ${vA.matchedEntity}`,
  );

  // 6b：anchor=p-c3-8（rose 实体 reveal 点已读过）
  const ctxB: AiContext = { bookId: BOOK_ID, chapterIndex: 2, paragraphId: "p-c3-8" };
  const vB = provider.judgeSpoiler("玫瑰是什么颜色的", ctxB);
  log(`  6b anchor=p-c3-8  verdict = ${fmtVerdict(vB)}`);
  assert("6b kind === ok（rose / rose-uniqueness 都已读过）", vB.kind === "ok");

  // 6c：anchor=p-c2-4（rose 概念的 reveal=p-c3-7 未跨过；rose 实体 reveal=p-c3-8 未跨过）
  const ctxC: AiContext = { bookId: BOOK_ID, chapterIndex: 1, paragraphId: "p-c2-4" };
  const vC = provider.judgeSpoiler("玫瑰是什么颜色的", ctxC);
  log(`  6c anchor=p-c2-4  verdict = ${fmtVerdict(vC)}`);
  assert("6c defer", vC.kind === "defer");
}

// ───────────────────────────────────────────────────────────────
log("\n=== 用例 7（补充）: 阅读地图节点合并 ===");
{
  const { getAiMapNodes } = await import("../app/lib/ai/mapNodes.ts");
  // 构造一些 chatMessages + pendingQuestions
  const chatMessages = [
    {
      id: "m1",
      role: "ai" as const,
      type: "normal" as const,
      content: "驯养，本就是把时间浇灌……",
      createdAt: Date.now(),
      citations: [{ paragraphId: "p-c3-8", snippet: "" }],
      conceptId: "taming",
    },
    {
      id: "m2",
      role: "ai" as const,
      type: "pending-release" as const,
      content: "还记得你问的「狐狸是谁？」……",
      createdAt: Date.now(),
      citations: [{ paragraphId: "p-c3-9", snippet: "" }],
      conceptId: "fox-meeting",
    },
    {
      id: "m3",
      role: "user" as const,
      type: "normal" as const,
      content: "应当被过滤（user 不进图）",
      createdAt: Date.now(),
    },
    {
      id: "m4",
      role: "ai" as const,
      type: "spoiler-blocked" as const,
      content: "应当被过滤（spoiler-blocked 不进图）",
      createdAt: Date.now(),
    },
  ];
  const pendingQuestions: PendingQuestion[] = [
    {
      id: "p1",
      userQuestion: "蛇象征什么？",
      paragraphId: "p-c2-5",
      revealAfterChapter: 3,
      revealAfterParagraphId: "p-c3-10",
      status: "pending",
    },
    {
      id: "p2",
      userQuestion: "狐狸是谁？",
      paragraphId: "p-c1-3",
      revealAfterChapter: 3,
      revealAfterParagraphId: "p-c3-9",
      status: "ready",
    },
  ];
  const nodes = getAiMapNodes(BOOK_ID, {
    chatMessages,
    pendingQuestions,
    demoNow: new Date(),
  });
  const counts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});
  log(`  节点总数 = ${nodes.length}`);
  log(`  分类 = ${JSON.stringify(counts)}`);
  const dialogueIds = nodes.filter((n) => n.id.startsWith("chat-")).map((n) => n.paragraphId);
  log(`  动态 dialogue 段落 = ${dialogueIds.join(", ")}`);
  const pendingNodes = nodes.filter((n) => n.id.startsWith("pending-"));
  log(`  pending 节点状态 = ${pendingNodes
    .map((n) => `${n.id}:${(n.payload as { pendingStatus?: string }).pendingStatus}`)
    .join(", ")}`);
  assert("character 静态种子 ≥ 9", (counts.character ?? 0) >= 9);
  assert("dialogue 节点存在（含动态 + theme 共存）", (counts.dialogue ?? 0) >= 2);
  assert("pending 节点 = 2", (counts.pending ?? 0) === 2);
  assert(
    "ready pending 节点 payload.pendingStatus === 'ready'",
    pendingNodes.find((n) => n.id === "pending-p2")?.payload &&
      (pendingNodes.find((n) => n.id === "pending-p2")!.payload as { pendingStatus?: string })
        .pendingStatus === "ready",
  );
}

log("\n=== 总结 ===");
log(process.exitCode ? "❌ 存在失败用例" : "✅ 全部用例通过");

console.log(lines.join("\n"));
