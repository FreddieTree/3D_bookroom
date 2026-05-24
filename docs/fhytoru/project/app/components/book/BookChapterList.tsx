import Link from "next/link";

import { getChaptersForBook } from "@/app/lib/data/sample-content";

type BookChapterListProps = {
  bookId: string;
};

/** 书籍详情页：章节目录（从本地样例内容生成，接入正文 API 后可替换数据源）。 */
export function BookChapterList({ bookId }: BookChapterListProps) {
  const chapters = getChaptersForBook(bookId);

  if (!chapters?.length) {
    return (
      <section className="mt-8" aria-label="章节目录">
        <h2 className="font-sans mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          章节目录
        </h2>
        <p className="font-sans rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          本书目录整理中。可先点击下方「开始阅读」进入已开放章节。
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-label="章节目录">
      <h2 className="font-sans mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        章节目录
      </h2>
      <ol className="space-y-2">
        {chapters.map((ch, i) => (
          <li key={ch.index}>
            <Link
              href={`/book/${bookId}/read?chapter=${i}`}
              prefetch
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/15 px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/35"
            >
              <span className="font-serif text-[0.9375rem] font-medium leading-snug text-foreground">
                {ch.title}
              </span>
              <span className="font-sans shrink-0 text-xs tabular-nums text-muted-foreground">
                {ch.paragraphs.length} 段
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
