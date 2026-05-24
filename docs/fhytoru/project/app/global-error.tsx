"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-dvh bg-[#faf6f0] px-6 py-16 text-center text-[#3d342b]">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-[#3d342b]/60">
          全局错误
        </p>
        <h1 className="font-serif mt-4 text-2xl font-semibold">应用需要重启</h1>
        <p className="font-sans mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-[#3d342b]/75">
          根布局加载失败。请点击下方重试；若持续出现，请清除站点数据后重新打开。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="font-sans mt-10 inline-flex h-12 min-w-[12rem] items-center justify-center rounded-2xl bg-[#b8763e] px-6 text-sm font-semibold text-[#faf6f0]"
        >
          重试
        </button>
      </body>
    </html>
  );
}
