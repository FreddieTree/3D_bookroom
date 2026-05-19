/**
 * Reading surface mocks: voice transcripts, streamed AI replies, suspense copy.
 * Body text stays in {@link sample-content}; helpers here augment UX demos.
 */

/** Mock ASR transcript after “recording” near the microphone. */
export function mockVoiceTranscriptNearParagraph(bookId: string): string {
  if (bookId === "little-prince") {
    return "小王子，玫瑰花为什么要长刺呢？这是不是她在保护自己？";
  }
  return "这段话写得很美，能多讲讲作者的用意吗？";
}

/**
 * Simulate streaming Assistant reply, one substring step at ~25ms intervals.
 */
export async function mockStreamAiReplyChars(
  fullText: string,
  onTick: (partial: string) => void,
  intervalMs = 25,
): Promise<void> {
  const step = Math.max(1, Math.ceil(fullText.length / 80));
  for (let i = 0; i <= fullText.length; i += step) {
    onTick(fullText.slice(0, Math.min(fullText.length, i + step)));
    if (i + step >= fullText.length) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  onTick(fullText);
}

function pauseAfterChar(ch: string, next: string | undefined): number {
  const base = 22 + Math.random() * 18;
  if (!next) return 120;
  if ("。!?！？".includes(ch)) return base + 200;
  if ("， ,；;：:".includes(ch)) return base + 80;
  if (ch === "\n") return base + 300;
  if ("。".includes(ch) && /\n/.test(next)) return base + 180;
  return base;
}

/** 逐字流式演示：标点处停顿更明显，读起来像「想一下再说」。 */
export async function mockStreamAiReplyThoughtful(
  fullText: string,
  onTick: (partial: string) => void,
): Promise<void> {
  for (let i = 0; i <= fullText.length; i += 1) {
    const slice = fullText.slice(0, i);
    onTick(slice);
    if (i >= fullText.length) break;
    const ch = fullText[i];
    await new Promise((r) =>
      setTimeout(r, pauseAfterChar(ch, fullText[i + 1])),
    );
  }
  onTick(fullText);
}

export function mockVoiceAiReply(bookId: string, userSnippet: string): string {
  if (bookId === "little-prince") {
    return `我读到你问：「${userSnippet.slice(0, 42)}${userSnippet.length > 42 ? "…" : ""}」。\n小王子的玫瑰长出尖刺，一半是骄傲，一半是害怕被轻视。刺猬把刺伸向世界，往往不是真的想伤害谁，而是在说：也请小心待我。\n我们可以在后文读到狐狸说的“驯养”——到那时，再回到这个问题，也许你会多一层答案。`;
  }
  return "我在这一段里听见了时间的回声。书里的人走得很慢，却把心事说得更清楚。我们继续往下读一两段，再找线索把答案铺开，好吗？";
}

export const MOCK_SUSPENSE_TEASER_COPY =
  "已记入悬念信箱，等你走到更远的章节，我再悄悄讲给你听。";

export const MOCK_SUSPENSE_RELEASE_PREFIX =
  "还记得你曾在星空下问的这句话吗？";

/** Override chapter label for onboarding demo when body still uses catalog text */
export function demoDisplayChapterTitle(
  bookId: string,
  chapterIndex: number,
  fallbackTitle: string,
): string {
  if (bookId === "little-prince" && chapterIndex === 2)
    return "第三章 · 玫瑰花的秘密";
  return fallbackTitle;
}
