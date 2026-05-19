/**
 * 客户端会话内缓存正文结构，供首页进度估算、后台同步百分比、地图等与阅读器对齐。
 */

import type { ChapterContent } from "@/app/lib/data/sample-content";

const cache = new Map<string, ChapterContent[]>();

/** 最近一次成功合并后的正文（不含「仅 DB 占位无段落」的中间态）。 */
export function registerBookChapterContent(
  bookId: string,
  chapters: ChapterContent[],
): void {
  if (bookId === "" || chapters.length === 0) return;
  cache.set(bookId, chapters);
}

export function getRegisteredBookChapterContent(
  bookId: string,
): ChapterContent[] | null {
  return cache.get(bookId) ?? null;
}
