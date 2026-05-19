"use client";

import Link from "next/link";

/** 自定义 404；Next 仍会生成 `_not-found` 路由兜底。 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground">
      <p className="font-sans text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        404
      </p>
      <h1 className="font-serif mt-3 text-2xl font-semibold">这一页走失了</h1>
      <p className="font-sans mt-3 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
        链接可能已经过期，或书单结构有调整。从这里回到书架继续读吧。
      </p>
      <div className="mt-10 flex w-full max-w-[16rem] flex-col gap-3">
        <Link
          href="/"
          className="font-sans inline-flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
        >
          回首页
        </Link>
        <Link
          href="/library"
          className="font-sans inline-flex h-12 items-center justify-center rounded-2xl border border-border text-sm font-medium transition-colors hover:bg-muted"
        >
          书库
        </Link>
      </div>
    </div>
  );
}
