import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { BookCoverActions } from "@/app/components/book/BookCoverActions";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";

type BookCoverPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function BookCoverPage({ params }: BookCoverPageProps) {
  const { bookId } = await params;

  return (
    <MobileContainer>
      <PageHeader />
      <main className="mx-auto flex w-full flex-1 flex-col px-6 pb-16 pt-2 sm:px-8">
        <header className="mb-8 space-y-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            书籍封面 / 章节目录
          </p>
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
            封面占位
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            书籍 ID：<span className="font-mono text-foreground">{bookId}</span>
          </p>
        </header>

        <PhaseBlurb>
          Phase 3：在此呈现元信息、章节列表与「继续阅读」入口。当前可直接跳转阅读器验证导航与
          store。
        </PhaseBlurb>

        <BookCoverActions bookId={bookId} />

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
