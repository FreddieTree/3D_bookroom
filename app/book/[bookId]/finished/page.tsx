import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";

type FinishedPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function FinishedPage({ params }: FinishedPageProps) {
  const { bookId } = await params;

  return (
    <MobileContainer>
      <PageHeader title="读完" />
      <main className="mx-auto flex w-full flex-1 flex-col px-6 pb-16 pt-2 sm:px-8">
        <header className="mb-8 space-y-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            成就与回顾
          </p>
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
            读完页（占位）
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            真棒，你已经走完这条演示路径。
          </p>
        </header>
        <PhaseBlurb>
          Phase 6：分享卡、书摘回顾与下一本推荐。当前可返回书架或重新进入同一本书。
        </PhaseBlurb>
        <nav className="font-sans mt-10 flex flex-col gap-3">
          <Link
            href={`/book/${bookId}`}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            回到封面
          </Link>
          <Link
            href="/library"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] active:scale-[0.99]"
          >
            去完整书架
          </Link>
        </nav>
      </main>
    </MobileContainer>
  );
}
