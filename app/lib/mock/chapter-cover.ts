/**
 * 章节封面文案与 BGM 标题（Mock）。正文仍以 `sample-content` 为准。
 */

import { getChaptersForBook } from "@/app/lib/data/sample-content";

const LITTLE_PRINCE_TAGLINES = [
  "六岁那年被退回的画笔，很多年后在撒哈拉上空重新发光。",
  "一句「给我画一只绵羊」，把沙漠的寂静轻轻敲开。",
  "在星星与玫瑰之间，我们路过国王、虚荣与点灯人，终于学会驯养。",
] as const;

const LITTLE_PRINCE_BGM = [
  "砂金·童年残响",
  "夜风·绵羊与盒子",
  "星际·点灯人的节拍",
] as const;

export function getChapterCoverMeta(
  bookId: string,
  chapterIndex: number,
): { tagline: string; bgmTitle: string; chapterTitle: string } | null {
  const chs = getChaptersForBook(bookId);
  if (!chs || chapterIndex < 0 || chapterIndex >= chs.length) return null;
  if (bookId === "little-prince") {
    return {
      chapterTitle: chs[chapterIndex]!.title,
      tagline:
        LITTLE_PRINCE_TAGLINES[
          Math.min(chapterIndex, LITTLE_PRINCE_TAGLINES.length - 1)
        ] ?? "",
      bgmTitle:
        LITTLE_PRINCE_BGM[
          Math.min(chapterIndex, LITTLE_PRINCE_BGM.length - 1)
        ] ?? "环境氛围",
    };
  }
  return {
    chapterTitle: chs[chapterIndex]!.title,
    tagline: "本章即将开始，沉浸式阅读为演示准备中。",
    bgmTitle: "章节氛围（占位）",
  };
}
