import Link from "next/link";

import { loadMergedChaptersForBook } from "@/app/lib/db/loadMergedChaptersForBook";
import type { ChapterContent } from "@/app/lib/data/sample-content";

type BookChapterListProps = {
  bookId: string;
};

function chapterKind(ch: ChapterContent): "frontmatter" | "body" | "backmatter" {
  return ch.chapterType ?? "body";
}

function compareBodyChapter(a: ChapterContent, b: ChapterContent): number {
  const ai = a.bodyIndex;
  const bi = b.bodyIndex;
  if (
    ai != null &&
    bi != null &&
    Number.isFinite(ai) &&
    Number.isFinite(bi) &&
    ai !== bi
  ) {
    return ai - bi;
  }
  return a.index - b.index;
}

/** 书籍详情页：正文目录默认展示；前言后记收入「版权与附录」折叠。 */
export async function BookChapterList({ bookId }: BookChapterListProps) {
  const chapters = await loadMergedChaptersForBook(bookId);

  if (!chapters.length) {
    return (
      <section className="mt-8" aria-label="章节目录">
        <h2 className="font-sans mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          章节目录
        </h2>
        <p className="font-sans rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          本书暂无已入库章节。可先连接数据库并执行入库流程，或通过「开始阅读」查看是否有试读占位。
        </p>
      </section>
    );
  }

  const bodyRows = chapters
    .filter((ch) => chapterKind(ch) === "body")
    .sort(compareBodyChapter);

  const frontBackRows = chapters
    .filter((ch) => {
      const k = chapterKind(ch);
      return k === "frontmatter" || k === "backmatter";
    })
    .sort((a, b) => a.index - b.index);

  return (
    <section className="mt-8" aria-label="章节目录">
      <h2 className="font-sans mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        章节目录
      </h2>

      {frontBackRows.length > 0 ? (
        <details className="mb-4 rounded-2xl border border-border/60 bg-muted/10 px-4 py-2">
          <summary className="cursor-pointer py-3 font-sans text-sm font-medium text-foreground outline-none marker:text-muted-foreground">
            版权与附录
            <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
              （{frontBackRows.length}）
            </span>
          </summary>
          <ol className="mt-2 space-y-2 border-t border-border/50 pb-2 pt-3">
            {frontBackRows.map((ch) => (
              <li key={`fb-${bookId}-${ch.index}`}>
                <div className="flex items-start justify-between gap-4 rounded-xl px-3 py-2">
                  <span className="min-w-0 flex-1 font-serif text-[0.875rem] leading-snug text-muted-foreground">
                    {ch.title}
                  </span>
                  <span className="shrink-0 font-sans text-xs tabular-nums text-muted-foreground/85">
                    {ch.paragraphs.length} 段
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <ol className="space-y-2">
        {bodyRows.map((ch, bodyOrdinal) => (
          <li key={`${bookId}-${ch.index}`}>
            <Link
              href={`/book/${bookId}/read?chapter=${bodyOrdinal}`}
              prefetch
              className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-muted/15 px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/35"
            >
              <span className="min-w-0 flex-1 font-serif text-[0.9375rem] font-medium leading-snug text-foreground">
                {ch.title}
              </span>
              <span className="shrink-0 font-sans text-xs tabular-nums tracking-tight text-muted-foreground">
                {ch.paragraphs.length}
                {" 段"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
