/**
 * MinimaxAiProvider —— 通过 Anthropic-compatible 网关调用 MiniMax 文本模型。
 *
 * Phase 2 已交付。流式生成由 server route `/api/chat` 代理，凭据 server-only。
 *
 * 设计原则（保持与 LocalAiProvider 互换）：
 *   - judgeSpoiler：复用本地精确判定（剧透控制不交给 LLM；悬念队列状态机依赖本地 reveal 元数据）
 *   - streamAsk / composeReleaseAnswer：
 *       1) 本地 scanQuery + scoreParagraphs 选 top-K 段落 + 主 concept（拿到稳定的 citations）
 *       2) 用上下文 + 已读段落原文做 prompt，POST /api/chat 拿网关流式输出
 *       3) 流回内容拼成 AiAnswer.text，附本地 citations / conceptId
 *   - 网络/网关任一失败 → catch → 退回 LocalAiProvider，保证 demo 不挂
 *
 * Server-only 凭据放在 `app/api/chat/route.ts`，本类不读 env。
 * 上游协议、模型可用性、踩坑记录见 docs/member-2-ai/README.md §11。
 */

import { LocalAiProvider } from "@/app/lib/ai/local";
import { pickPrimaryConcept } from "@/app/lib/ai/local/concepts";
import {
  scanQuery,
  scoreParagraphs,
  topKParagraphs,
  type ScoredParagraph,
} from "@/app/lib/ai/local/retrieval";
import { judgeSpoilerForBook } from "@/app/lib/ai/local/spoiler";
import {
  hasReadThrough,
  LITTLE_PRINCE_BOOK_ID,
} from "@/app/lib/ai/data/littlePrince";
import type {
  AiAnswer,
  AiContext,
  Citation,
  IAiProvider,
  PendingQuestion,
  SpoilerVerdict,
} from "@/app/lib/ai/types";
import type { PreprocessedConcept } from "@/app/lib/ai/data/schema";

const SYSTEM_PROMPT = `你是「三维书屋」中陪伴用户阅读的 AI 共读伙伴。
- 回答要紧贴用户所读文本，语气温柔、不卖弄、不喧宾夺主。
- 字数控制在 2-4 句话；如果用户问到尚未读到的内容，要点到为止，不要替原文剧透。
- 你会收到「已读上下文」（用户已经读到的相关段落原文），尽量基于其中的字句作答。
- 如果上下文为空，可以基于书本通识温柔地回答，避免编造原文未出现的细节。`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function makeSnippet(text: string, max = 60): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function buildUserPrompt(args: {
  query: string;
  ctx: AiContext;
  readContext: ScoredParagraph[];
  primary: PreprocessedConcept | null;
}): string {
  const { query, ctx, readContext, primary } = args;
  const ctxBlock =
    readContext.length === 0
      ? "（用户尚未读到强相关段落，请基于通识温柔回答。）"
      : readContext
          .map(
            (p, i) =>
              `[${i + 1}] (段落 ${p.paragraphId}，第 ${p.chapterIndex + 1} 章)\n${p.text}`,
          )
          .join("\n\n");

  const conceptLine = primary
    ? `主题方向参考：${primary.labels.slice(0, 4).join(" / ")}（concept=${primary.id}）`
    : "主题方向：让用户自己感受文本。";

  const anchorLine = ctx.paragraphId
    ? `用户当前阅读 anchor：${ctx.paragraphId}`
    : "用户尚未定位到具体段落。";

  return [
    `# 用户提问`,
    query,
    "",
    `# ${anchorLine}`,
    `# ${conceptLine}`,
    "",
    `# 已读上下文（仅这些段落可被引用，不要引用 anchor 之后的内容）`,
    ctxBlock,
    "",
    `请用 2-4 句话回答用户。`,
  ].join("\n");
}

async function streamFromGateway(args: {
  system: string;
  messages: ChatTurn[];
  onToken: (partial: string) => void;
}): Promise<string> {
  const { system, messages, onToken } = args;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`/api/chat ${res.status}: ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let evt: { type?: string; text?: string; message?: string };
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }
      if (evt.type === "delta" && typeof evt.text === "string") {
        full += evt.text;
        onToken(full);
      } else if (evt.type === "error") {
        throw new Error(evt.message ?? "gateway error");
      }
    }
  }
  return full;
}

export class MinimaxAiProvider implements IAiProvider {
  readonly name = "minimax";
  private readonly fallback = new LocalAiProvider();

  /** 剧透判定永远走本地（保证悬念队列状态机与 UI 行为一致） */
  judgeSpoiler(text: string, ctx: AiContext): SpoilerVerdict {
    return judgeSpoilerForBook(text, ctx);
  }

  async streamAsk(
    text: string,
    ctx: AiContext,
    onToken: (partial: string) => void,
  ): Promise<AiAnswer> {
    try {
      // 1. 本地 retrieval 拿 citations / 主 concept
      const { citations, readSlices, primary } = this.localRetrieve(text, ctx);

      // 2. 调网关流式生成
      const userPrompt = buildUserPrompt({
        query: text,
        ctx,
        readContext: readSlices,
        primary,
      });
      const fullText = await streamFromGateway({
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        onToken,
      });
      if (!fullText.trim()) {
        // 网关返回空 → 视作失败，走兜底
        throw new Error("远端返回空内容");
      }
      return {
        text: fullText,
        citations,
        conceptId: primary?.id,
      };
    } catch (e) {
      console.warn("[MinimaxAiProvider.streamAsk] fallback to local:", e);
      return this.fallback.streamAsk(text, ctx, onToken);
    }
  }

  composeReleaseAnswer(
    pending: PendingQuestion,
    ctx: AiContext,
  ): AiAnswer {
    // 揭晓卡是同步接口，无法走流式。直接退回本地确定性答案（仍带 citations）。
    return this.fallback.composeReleaseAnswer(pending, ctx);
  }

  private localRetrieve(
    text: string,
    ctx: AiContext,
  ): {
    citations: Citation[];
    readSlices: ScoredParagraph[];
    primary: PreprocessedConcept | null;
  } {
    if (ctx.bookId !== LITTLE_PRINCE_BOOK_ID) {
      return { citations: [], readSlices: [], primary: null };
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

    // 只把"已读"段落塞进上下文给 LLM；citations 字段也只暴露已读段落，避免剧透
    const read: ScoredParagraph[] = [];
    for (const c of candidates) {
      if (hasReadThrough(ctx.paragraphId, c.paragraphId)) read.push(c);
    }
    const citations: Citation[] = read.slice(0, 3).map((r) => ({
      paragraphId: r.paragraphId,
      snippet: makeSnippet(r.text),
    }));
    return { citations, readSlices: read, primary };
  }
}
