import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";

export default function InstallPage() {
  return (
    <MobileContainer>
      <PageHeader title="安装" />
      <main className="mx-auto flex w-full flex-1 flex-col px-6 pb-20 pt-2 sm:px-8">
        <header className="mb-8 space-y-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Progressive Web App
          </p>
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
            添加到主屏幕
          </h1>
        </header>

        <PhaseBlurb>
          Phase 2：自定义图标、启动图、离线缓存与安装提示。黑客松演示建议使用 iPhone
          Safari → 分享 → 添加到主屏幕。
        </PhaseBlurb>

        <ol className="font-sans mt-10 list-decimal space-y-4 pl-5 text-[0.9375rem] leading-relaxed text-foreground marker:text-primary">
          <li>使用 Safari 打开线上地址（需要 HTTPS）。</li>
          <li>点击底部分享按钮 · 选择「添加到主屏幕」。</li>
          <li>从主屏幕图标启动，即可获得接近原生壳的全屏体验。</li>
        </ol>

        <Link
          href="/settings"
          className="font-sans mt-12 inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          返回设置
        </Link>
      </main>
    </MobileContainer>
  );
}
