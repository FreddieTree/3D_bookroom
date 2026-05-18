import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { BookCoverActions } from "@/app/components/book/BookCoverActions";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";
import { getBookById } from "@/app/lib/data/books";

type BookCoverPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function BookCoverPage({ params }: BookCoverPageProps) {
  const { bookId } = await params;
  const book = getBookById(bookId);

  return (
    <MobileContainer>
      <PageHeader />
      <main className="mx-auto flex w-full flex-1 flex-col px-6 pb-16 pt-2 sm:px-8">
        <header className="mb-8 space-y-4">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            书籍封面 / 章节目录
          </p>
          {book ? (
            <>
              <div className="flex gap-4">
                <div
                  className="flex h-[5.5rem] w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-border text-3xl shadow-[var(--shadow-soft)]"
                  style={{ background: book.coverColor }}
                >
                  {book.coverEmoji ?? null}
                </div>
                <div className="min-w-0 space-y-1">
                  <h1 className="font-serif text-[1.65rem] font-semibold leading-tight text-foreground">
                    {book.title}
                  </h1>
                  <p className="font-sans text-sm text-muted-foreground">
                    {book.titleEn}
                  </p>
                  <p className="font-sans text-sm text-foreground">{book.author}</p>
                </div>
              </div>
              <p className="font-serif text-[0.9375rem] leading-relaxed text-muted-foreground">
                {book.shortDesc}
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                {book.totalChapters} 章 · 约 {book.estimatedHours} 小时
                {book.isReady ? "" : " · 预处理未完成"}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
                未找到书籍
              </h1>
              <p className="font-sans text-sm text-muted-foreground">
                ID：<span className="font-mono text-foreground">{bookId}</span>
              </p>
            </>
          )}
        </header>

        {book ? (
          <PhaseBlurb>
            Phase 3：在此呈现完整章节列表与「继续阅读」入口。当前可跳转阅读器验证导航与
            store。
          </PhaseBlurb>
        ) : null}

        {book ? <BookCoverActions bookId={bookId} isReady={book.isReady} /> : null}

        <nav className="font-sans mt-10 space-y-2 text-sm text-muted-foreground">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            快捷演示
          </p>
          <Link
            href={`/book/${bookId}/map`}
            className="block rounded-xl px-3 py-2 text-foreground hover:bg-muted"
          >
            直接去阅读地图（占位）
          </Link>
          <Link
            href={`/book/${bookId}/finished`}
            className="block rounded-xl px-3 py-2 text-foreground hover:bg-muted"
          >
            直接去读完页（占位）
          </Link>
        </nav>
      </main>
    </MobileContainer>
  );
}
