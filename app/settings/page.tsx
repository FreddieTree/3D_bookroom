import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";
import { SettingsStoreCard } from "@/app/components/settings/SettingsStoreCard";

export default function SettingsPage() {
  return (
    <MobileContainer>
      <PageHeader title="设置" />
      <main className="mx-auto flex w-full flex-1 flex-col px-6 pb-20 pt-2 sm:px-8">
        <header className="mb-8 space-y-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            偏好 · 账号 · 用量
          </p>
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
            设置与 Token 仪表盘
          </h1>
        </header>

        <PhaseBlurb>
          Phase 4：模型选择、隐私开关、朗读与实验功能。下方为本地持久化状态预览（无后端）。
        </PhaseBlurb>

        <SettingsStoreCard />

        <nav className="font-sans mt-12 space-y-3 border-t border-border pt-10 text-sm">
          <Link
            href="/install"
            className="flex flex-col rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
          >
            PWA 安装引导
            <span className="text-xs text-muted-foreground">
              添加到主屏幕步骤预览
            </span>
          </Link>
          <Link
            href="/library"
            className="flex flex-col rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
          >
            完整书架
          </Link>
        </nav>
      </main>
    </MobileContainer>
  );
}
