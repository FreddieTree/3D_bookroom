import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { BookOpenCTA } from "@/app/components/shelf/BookOpenCTA";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";
import { DEMO_BOOK_ID, DEMO_BOOK_TITLE } from "@/app/lib/constants";

type BookshelfLayoutProps = {
  heading: string;
  /** Phase note differs slightly between home shelf vs full library. */
  phaseNote: string;
};

export function BookshelfLayout({ heading, phaseNote }: BookshelfLayoutProps) {
  return (
    <MobileContainer>
      <main className="mx-auto flex w-full flex-1 flex-col px-6 pb-12 pt-6 sm:px-8">
        <header className="mb-10 space-y-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            三维书屋
          </p>
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground sm:text-[2rem]">
            {heading}
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            暖色纸张 · 克制排版 · 为沉浸式阅读预留呼吸感
          </p>
        </header>

        <PhaseBlurb>{phaseNote}</PhaseBlurb>

        <section className="mt-10 space-y-4" aria-label="书架预览">
          <BookOpenCTA bookId={DEMO_BOOK_ID} title={DEMO_BOOK_TITLE} />
        </section>

        <nav
          className="font-sans mt-14 flex flex-col gap-3 border-t border-border pt-10 text-sm"
          aria-label="页面导航"
        >
          <Link
            href="/library"
            className="rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
          >
            完整书架
            <span className="mt-0.5 block text-xs text-muted-foreground">
              与首页相同的占位目录 · Phase 3+
            </span>
          </Link>
          <Link
            href="/settings"
            className="rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
          >
            设置与用量
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Token 仪表盘占位 · Phase 4
            </span>
          </Link>
          <Link
            href="/install"
            className="rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
          >
            添加到主屏幕
            <span className="mt-0.5 block text-xs text-muted-foreground">
              PWA 安装引导 · Phase 2
            </span>
          </Link>
        </nav>
      </main>
    </MobileContainer>
  );
}
