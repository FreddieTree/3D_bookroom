import { BookChapterList } from "@/app/components/book/BookChapterList";
import { BookCoverActions } from "@/app/components/book/BookCoverActions";
import { DemoBookShortcuts } from "@/app/components/book/DemoBookShortcuts";
import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
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
        <header className="mb-2 space-y-4">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            书籍详情
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

        {book ? <BookChapterList bookId={bookId} /> : null}

        {book ? (
          <BookCoverActions bookId={bookId} isReady={book.isReady} />
        ) : null}

        {book ? <DemoBookShortcuts bookId={bookId} /> : null}
      </main>
    </MobileContainer>
  );
}
