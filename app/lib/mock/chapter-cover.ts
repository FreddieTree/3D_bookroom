/**
 * 章节封面文案与 BGM 标题。
 * —— 数据源可为 DB（传 `resolvedChapterTitle`）、或演示 `sample-content`。
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
  resolvedChapterTitle?: string | null,
): { tagline: string; bgmTitle: string; chapterTitle: string } {
  const demoChapters = getChaptersForBook(bookId);
  const demoChapter = demoChapters?.[chapterIndex];

  const chapterTitle =
    (resolvedChapterTitle && resolvedChapterTitle.trim()) ||
    demoChapter?.title?.trim() ||
    `第 ${chapterIndex + 1} 章`;

  const useLittlePrinceDressing =
    bookId === "little-prince" && Boolean(demoChapter);

  if (useLittlePrinceDressing && demoChapter) {
    return {
      chapterTitle,
      tagline:
        LITTLE_PRINCE_TAGLINES[
          Math.min(chapterIndex, LITTLE_PRINCE_TAGLINES.length - 1)
        ] ?? "",
      bgmTitle:
        LITTLE_PRINCE_BGM[Math.min(chapterIndex, LITTLE_PRINCE_BGM.length - 1)] ??
        "环境氛围",
    };
  }

  return {
    chapterTitle,
    tagline: "本章即将开始，准备好进入阅读。",
    bgmTitle: "章节氛围音乐",
  };
}
