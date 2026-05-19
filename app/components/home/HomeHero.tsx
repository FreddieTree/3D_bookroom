"use client";

import Link from "next/link";

import { Card3D } from "@/app/components/ui/Card3D";

export function HomeHero() {
  return (
    <section className="mb-12 px-1 pt-2 text-center" aria-labelledby="home-title">
      <h1
        id="home-title"
        className="font-serif text-[2.25rem] font-semibold tracking-tight text-foreground sm:text-[2.4rem]"
      >
        三维书屋
      </h1>
      <p className="font-sans mt-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
        3D Bookroom · AI 沉浸式阅读伴侣
      </p>

      <div className="mt-10 flex flex-col items-center gap-9">
        <div className="w-full max-w-[15rem]">
          <Card3D depth={3} enableTilt>
            <div className="flex flex-col items-center gap-2 px-6 py-7">
              <div
                className="flex h-28 w-[5.75rem] items-center justify-center rounded-xl border border-border/70 text-[2.85rem] shadow-[var(--shadow-elevation-1)]"
                style={{
                  background:
                    "color-mix(in oklch, var(--color-primary) 38%, var(--surface-2))",
                }}
                aria-hidden
              >
                🌹
              </div>
              <p className="font-serif text-lg font-semibold text-foreground">小王子</p>
              <p className="font-sans max-w-[12rem] text-xs leading-snug text-muted-foreground">
                The Little Prince
              </p>
            </div>
          </Card3D>
          <p className="font-sans mt-3 text-[11px] text-muted-foreground">
            在桌面试着移动鼠标掠过卡片边缘；在手机轻触卡片感受厚度。
          </p>
        </div>

        <Link
          href="/library"
          prefetch
          className="font-sans inline-flex min-h-[3rem] min-w-[13rem] items-center justify-center rounded-2xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-book transition-[transform,box-shadow] active:scale-[0.98]"
        >
          浏览书架
        </Link>
      </div>
    </section>
  );
}
