import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { ReaderTopBar } from "@/app/components/book/ReaderTopBar";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";

type ReaderPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = await params;

  return (
    <MobileContainer>
      <ReaderTopBar bookId={bookId} />
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-10 pt-2 sm:px-8">
        <main className="flex min-h-0 flex-1 flex-col justify-center space-y-8">
          <header className="space-y-3">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              阅读器 · 预留全屏区
            </p>
            <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
              阅读器主界面（占位）
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              后续此处铺满正文与动效；外层已用 flex-1 预留纵向空间。
            </p>
          </header>
          <PhaseBlurb>
            Phase 4：版式、翻页/滚动手势、AI 伴读面板与进度同步。顶部右侧地图按钮已可用。
          </PhaseBlurb>
          <div className="font-sans flex flex-wrap gap-3">
            <Link
              href={`/book/${bookId}/map`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              跳转阅读地图
            </Link>
            <Link
              href={`/book/${bookId}/finished`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] active:scale-[0.99]"
            >
              标记读完（演示）
            </Link>
          </div>
        </main>
      </div>
    </MobileContainer>
  );
}
