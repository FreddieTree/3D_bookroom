import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <MobileContainer>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/40 text-primary">
          <WifiOff className="size-8" strokeWidth={1.5} aria-hidden />
        </div>
        <h1 className="font-serif text-xl font-semibold text-foreground">
          当前处于离线状态
        </h1>
        <p className="font-sans mt-3 max-w-[20rem] text-sm leading-relaxed text-muted-foreground">
          已尝试使用本地缓存，但该页面尚不可用。请检查网络后重试，或返回首页。
        </p>
        <Link
          href="/"
          prefetch={false}
          className="font-sans mt-8 inline-flex h-12 min-w-[11rem] items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
        >
          返回首页
        </Link>
      </main>
    </MobileContainer>
  );
}
