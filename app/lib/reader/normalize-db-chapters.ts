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
  chapterType?: "frontmatter" | "body" | "backmatter";
  bodyIndex?: number | null;
};

export function normalizeDbChapterDoc(doc: LeanChapterDoc): ChapterContent {
  const { bookId, index, title, paragraphs, chapterType, bodyIndex } = doc;
  const sorted = [...paragraphs].sort((a, b) => a.order - b.order);
  const chapterFinger = `${bookId}:${index}`;
  const out: Paragraph[] = sorted.map((p) => ({
    id: p.id,
    text: p.text,
    chapterId: chapterFinger,
  }));
  return {
    bookId,
    index,
    title,
    paragraphs: out,
    chapterType,
    bodyIndex: bodyIndex ?? undefined,
  };
}

export function normalizeDbChapterDocs(docs: LeanChapterDoc[]): ChapterContent[] {
  return [...docs].map(normalizeDbChapterDoc);
}
