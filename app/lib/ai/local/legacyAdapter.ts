/**
 * Legacy adapter —— 把原 `app/lib/mock/chat.ts` 的纯函数迁移到 AI 层内部，
 * 避免「mock/chat.ts 转发到 provider，provider 又依赖 mock/chat.ts」的循环依赖。
 *
 * Step 4 之后这些函数会被新 composer / retrieval 取代，文件届时删除。
 *
 * 注意：这些函数仍是**确定性**的，可以安全在客户端任何上下文调用。
 */

import { demoCharTickMs } from "@/app/lib/env/demo";
import type { PendingQuestion } from "@/app/lib/ai/types";

export const LEGACY_REVEAL_CHAPTER = 3;

const SPOILER_KEYS = ["为什么", "是谁", "怎么会", "什么原因", "到底", "为何"];

export function legacyShouldDeferAsSpoiler(userText: string): boolean {
  const t = userText.trim();
  if (t.length < 2) return false;
  return SPOILER_KEYS.some((k) => t.includes(k));
}

export function legacyStreamChars(
  fullText: string,
  onUpdate: (partial: string) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const delay = demoCharTickMs(20);
    if (delay === 0) {
      queueMicrotask(() => {
        onUpdate(fullText);
        resolve();
      });
      return;
    }
    if (fullText.length === 0) {
      resolve();
      return;
    }
    let i = 0;
    const tick = () => {
      i += 1;
      onUpdate(fullText.slice(0, i));
      if (i >= fullText.length) {
        resolve();
        return;
      }
      window.setTimeout(tick, delay);
    };
    window.setTimeout(tick, delay);
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

export function legacyPickNormalReply(
  userText: string,
  paragraphId: string | null,
): string {
  void paragraphId;
  const t = userText.toLowerCase();
  if (/玫瑰|花/.test(userText)) return TEMPLATES.rose;
  if (/蛇/.test(userText)) return TEMPLATES.snake;
  if (/羊/.test(userText)) return TEMPLATES.sheep;
  if (/星星|星/.test(userText)) return TEMPLATES.star;
  if (/小王子|狐狸|驯养/.test(userText)) return TEMPLATES.rose;
  if (t.length < 4) {
    return "你可以具体写一段原文或你的困惑，我会顺着文本的语气回答。";
  }
  return TEMPLATES.default;
}

export function legacySpoilerQueueCopy(revealChapter: number): string {
  return `已加入悬念队列，第 ${revealChapter} 章会揭晓`;
}

export function legacyMockReleaseAnswer(pending: PendingQuestion): string {
  const q = pending.userQuestion;
  const head = q.length > 36 ? `${q.slice(0, 36)}…` : q;
  return `还记得你问的「${head}」吗？答案是：真正让玫瑰变得重要的，不是她的颜色，而是你在她身上耗费的时间——驯养即责任，也是温柔。`;
}

export async function legacyMockChatResponse(
  userText: string,
  paragraphId: string | null,
  onToken: (partial: string) => void,
): Promise<string> {
  const reply = legacyPickNormalReply(userText, paragraphId);
  await legacyStreamChars(reply, onToken);
  return reply;
}
