"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16 text-center text-foreground">
      <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        出了点问题
      </p>
      <h1 className="font-serif mt-3 text-2xl font-semibold">
        页面遇到一些错误
      </h1>
      <p className="font-sans mt-3 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
        请重试或返回首页。若你刚升级了应用版本，可尝试刷新页面。
      </p>
      <div className="mt-10 flex w-full max-w-[16rem] flex-col gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="font-sans inline-flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
        >
          再试一次
        </button>
        <Link
          href="/"
          className="font-sans inline-flex h-12 items-center justify-center rounded-2xl border border-border text-sm font-medium transition-colors hover:bg-muted"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
