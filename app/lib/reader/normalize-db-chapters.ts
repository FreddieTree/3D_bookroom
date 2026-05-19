/**
 * Mongo `chapters` 文档 → 阅读器可用的 `ChapterContent`（段落带 `chapterId` 指纹）。
 */
import type { ChapterContent, Paragraph } from "@/app/lib/data/sample-content";

type LeanParagraph = {
  id: string;
  text: string;
  order: number;
};

type LeanChapterDoc = {
  bookId: string;
  index: number;
  title: string;
  paragraphs: LeanParagraph[];
};

export function normalizeDbChapterDoc(doc: LeanChapterDoc): ChapterContent {
  const { bookId, index, title, paragraphs } = doc;
  const sorted = [...paragraphs].sort((a, b) => a.order - b.order);
  const chapterFinger = `${bookId}:${index}`;
  const out: Paragraph[] = sorted.map((p) => ({
    id: p.id,
    text: p.text,
    chapterId: chapterFinger,
  }));
  return { bookId, index, title, paragraphs: out };
}

export function normalizeDbChapterDocs(docs: LeanChapterDoc[]): ChapterContent[] {
  return [...docs].sort((a, b) => a.index - b.index).map(normalizeDbChapterDoc);
}
