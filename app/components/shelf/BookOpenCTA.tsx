"use client";

import Link from "next/link";

import { useAppStore } from "@/app/lib/stores/appStore";

type BookOpenCTAProps = {
  bookId: string;
  title: string;
};

export function BookOpenCTA({ bookId, title }: BookOpenCTAProps) {
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId);

  return (
    <Link
      href={`/book/${bookId}`}
      onClick={() => setCurrentBookId(bookId)}
      className="group font-sans block rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] active:scale-[0.99]"
    >
      <div className="flex gap-4">
        <div
          className="flex h-[4.5rem] w-14 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary"
          aria-hidden
        >
          Book
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
            点按进入封面
          </p>
          <p className="font-serif text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
            {title}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            演示路径：封面 → 阅读器 → 阅读地图 → 读完页
          </p>
        </div>
      </div>
    </Link>
  );
}
