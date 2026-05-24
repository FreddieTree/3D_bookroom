/**
 * 章节封面文案与 BGM 标题。
 * Python pipeline 产出的章节编号：
 *   ch001-ch004 = 版权/目录/导读/献辞（非故事）
 *   ch005-ch031 = 故事第 1-27 章，对应前端 chapterIndex 0-26（c1-c27）
 */

import { getChaptersForBook } from "@/app/lib/data/sample-content";

export type ChapterCoverMeta = {
  tagline: string;
  bgmTitle: string;
  chapterTitle: string;
  illustrationUrl?: string;
  bgmUrl?: string;
};

// 前端 chapterIndex（0-based）→ Python ch 编号（ch005 = index 0）
function pipelineChId(chapterIndex: number): string {
  const n = chapterIndex + 5; // 0→ch005, 1→ch006, ...
  return `ch${String(n).padStart(3, "0")}`;
}

const LITTLE_PRINCE_TAGLINES = [
  "六岁那年被退回的画笔，很多年后在撒哈拉上空重新发光。",
  "一句「给我画一只绵羊」，把沙漠的寂静轻轻敲开。",
  "在星星与玫瑰之间，我们路过国王、虚荣与点灯人，终于学会驯养。",
  "玫瑰说：我爱你，但你要走。小王子说：我知道。",
  "每一颗星星都在笑，因为那里住着一朵花。",
  "驯养，就是建立联系。狐狸这样说，然后消失在麦田里。",
  "重要的东西用眼睛是看不见的，只有用心才能看清。",
  "沙漠之所以美丽，是因为它在某个地方藏着一口井。",
  "我负责的玫瑰，让我对她永远负责。",
  "回去的路不是地图上的方向，而是心里的那颗星。",
] as const;

export function getChapterCoverMeta(
  bookId: string,
  chapterIndex: number,
  resolvedChapterTitle?: string | null,
): ChapterCoverMeta | null {
  const chs = getChaptersForBook(bookId);
  if (!chs || chapterIndex < 0 || chapterIndex >= chs.length) return null;

  const chapterTitle =
    (resolvedChapterTitle && resolvedChapterTitle.trim()) ||
    chs[chapterIndex]!.title;

  if (bookId === "little-prince") {
    const chId = pipelineChId(chapterIndex);
    const base = `/books/little-prince/chapters/${chId}`;
    const taglineIdx = Math.min(chapterIndex, LITTLE_PRINCE_TAGLINES.length - 1);

    return {
      chapterTitle,
      tagline: LITTLE_PRINCE_TAGLINES[taglineIdx] ?? "本章即将开始。",
      bgmTitle: `星球氛围 · 第${chapterIndex + 1}章`,
      illustrationUrl: `${base}/illustration.png`,
      bgmUrl: `${base}/music.mp3`,
    };
  }

  return {
    chapterTitle,
    tagline: "本章即将开始，准备好进入阅读。",
    bgmTitle: "章节氛围音乐",
  };
}
