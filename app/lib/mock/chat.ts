/**
 * TODO(成员2): 将 `mockChatResponse`（及内部的 `streamChars`、`shouldDeferAsSpoiler`、模板）
 * 替换为真实 AI 接口（SSE 或 WebSocket）。保留相同对外行为即可在无改动 UI 的情况下切换。
 */

export type ChatMessageType = "normal" | "spoiler-blocked" | "pending-release";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  type: ChatMessageType;
  pendingId?: string;
  /** Unix ms — persist 友好 */
  createdAt: number;
  isStreaming?: boolean;
}

export interface PendingQuestion {
  id: string;
  userQuestion: string;
  paragraphId: string | null;
  revealAfterChapter: number;
}

const SPOILER_KEYS = ["为什么", "是谁", "怎么会", "什么原因", "到底", "为何"];

export function shouldDeferAsSpoiler(userText: string): boolean {
  const t = userText.trim();
  if (t.length < 2) return false;
  return SPOILER_KEYS.some((k) => t.includes(k));
}

/** 逐字输出（20ms / 字） */
export function streamChars(
  fullText: string,
  onUpdate: (partial: string) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      i += 1;
      onUpdate(fullText.slice(0, i));
      if (i >= fullText.length) {
        resolve();
        return;
      }
      window.setTimeout(tick, 20);
    };
    if (fullText.length === 0) {
      resolve();
      return;
    }
    window.setTimeout(tick, 20);
  });
}

const TEMPLATES = {
  rose: "玫瑰之所以独一无二，是因为小王子为她浇灌、为她挡风——驯养就是在时间里投下的那一瞥，让平凡变得不可替代。",
  snake: "蛇在故事里常是一跃之间的隐喻：有些告别看起来像终结，却可能是另一种返回的起点。",
  sheep: "盒子里的绵羊看不见，却正好留出想象的位置——大人要看得见的证明，孩子要的是信任里的形状。",
  star: "当你夜里抬头，某颗星星之所以在笑，是因为远方有一颗小小行星，那里住着在乎你的人。",
  default:
    "这一段像是在说：真正重要的东西，眼睛常常看不见，要用心去体会。你也可以再点名一段话，我尽量用更接近文本的方式陪你读。",
} as const;

export function pickNormalReply(userText: string, paragraphId: string | null): string {
  void paragraphId;
  const t = userText.toLowerCase();
  if (/玫瑰|花/.test(userText)) return TEMPLATES.rose;
  if (/蛇/.test(userText)) return TEMPLATES.snake;
  if (/羊/.test(userText)) return TEMPLATES.sheep;
  if (/星星|星/.test(userText)) return TEMPLATES.star;
  if (/小王子|狐狸|驯养/.test(userText)) return TEMPLATES.rose;
  if (t.length < 4) return "你可以具体写一段原文或你的困惑，我会顺着文本的语气回答。";
  return TEMPLATES.default;
}

export function spoilerQueueCopy(revealChapter: number): string {
  return `已加入悬念队列，第 ${revealChapter} 章会揭晓`;
}

export function mockReleaseAnswer(pending: PendingQuestion): string {
  return `还记得你问的「${pending.userQuestion.slice(0, 36)}${pending.userQuestion.length > 36 ? "…" : ""}」吗？答案是：真正让玫瑰变得重要的，不是她的颜色，而是你在她身上耗费的时间——驯养即责任，也是温柔。`;
}

/** Mock 统一入口：普通回复走流式逐字；悬念判定在外部（store）处理 */
export async function mockChatResponse(
  userText: string,
  paragraphId: string | null,
  onToken: (partial: string) => void,
): Promise<string> {
  const reply = pickNormalReply(userText, paragraphId);
  await streamChars(reply, onToken);
  return reply;
}
