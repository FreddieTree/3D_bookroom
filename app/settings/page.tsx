"use client";

import { useState } from "react";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { MultiDeviceSyncSection } from "@/app/components/settings/MultiDeviceSyncSection";
import { SettingsHub } from "@/app/components/settings/SettingsHub";
import { APP_SEMVER_LABEL } from "@/app/lib/app-meta";

export default function SettingsPage() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <MobileContainer>
      <div className="px-6 pb-28 sm:px-8">
        <PageHeader title="设置" backHref="/" />
        <p className="font-serif mt-2 px-2 text-[0.7rem] text-muted-foreground">
          账户信息与偏好 · 全部为本地 Mock
        </p>

        <div className="mt-9 px-2">
          <MultiDeviceSyncSection />
          <SettingsHub />
        </div>

        <footer className="mt-14 px-2 text-center">
          <p className="font-sans text-[0.6875rem] text-muted-foreground">
            版本 {APP_SEMVER_LABEL}
          </p>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="font-serif mt-4 inline-flex text-[0.8rem] font-semibold text-primary underline-offset-[0.35em] hover:underline"
          >
            关于三维书屋
          </button>
        </footer>
      </div>

      {aboutOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-about-heading"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24 backdrop-blur-[1px] sm:items-center"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[1.125rem] border border-border bg-background p-[1.4rem] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="settings-about-heading"
              className="font-serif text-lg font-semibold tracking-tight"
            >
              关于三维书屋
            </h2>
            <p className="mt-3 font-serif text-[0.9rem] leading-relaxed text-muted-foreground">
              当前原型{" "}
              <span className="font-mono tabular-nums text-foreground">
                {APP_SEMVER_LABEL}
              </span>
              ，探索「沉浸式阅读 × 共读想象」的移动书房体验。多端同步、计费与云端书库将陆续接入，
              UI 保持不变即可热迁移。
            </p>
            <button
              type="button"
              className="mt-6 h-11 w-full rounded-xl bg-primary font-sans text-sm font-semibold text-primary-foreground"
              onClick={() => setAboutOpen(false)}
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </MobileContainer>
  );
}
