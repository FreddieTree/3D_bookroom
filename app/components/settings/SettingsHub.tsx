"use client";

import Link from "next/link";
import { useState } from "react";

import { SUBSCRIPTION_PLANS } from "@/app/lib/mock/account-mock";
import type { ReaderThemeMode } from "@/app/lib/stores/appStore";
import { useAppStore } from "@/app/lib/stores/appStore";
import { cn } from "@/app/lib/utils";

const APP_VERSION = "0.1.0";

const FONT_SIZES = [14, 16, 18, 20, 22] as const;

function formatInt(n: number) {
  return n.toLocaleString("zh-CN");
}

function TokenRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, pct));
  const dash = c * (1 - clamped);

  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="10"
      />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={dash}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

function mockUpgrade(tier: string) {
  window.alert(
    `升级至「${tier}」功能敬请期待。\n当前为演示环境，不接真实支付。`,
  );
}

function ToggleRow({
  label,
  description,
  on,
  onToggle,
}: {
  label: string;
  description?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-sans text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 font-sans text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border transition-colors",
          on
            ? "border-primary/50 bg-primary/25"
            : "border-border bg-muted/40",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-background shadow-sm transition-transform",
            on ? "left-7" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

export function SettingsHub() {
  const readerSettings = useAppStore((s) => s.readerSettings);
  const setReaderSettings = useAppStore((s) => s.setReaderSettings);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const mockUser = useAppStore((s) => s.mockUser);
  const mockTokenUsage = useAppStore((s) => s.mockTokenUsage);
  const mockSignOut = useAppStore((s) => s.mockSignOut);

  const [aboutOpen, setAboutOpen] = useState(false);

  const cap = Math.max(0, mockTokenUsage.monthlyCap);
  const usedPct =
    cap > 0
      ? Math.min(1, Math.max(0, mockTokenUsage.monthlyUsed / cap))
      : 0;

  const setTheme = (theme: ReaderThemeMode) =>
    setReaderSettings({ theme });

  return (
    <div className="space-y-8 pb-10">
      <section
        className={cn(
          "overflow-hidden rounded-3xl border border-border/90 p-[1px]",
          "bg-gradient-to-br from-[color-mix(in_oklch,var(--primary)_18%,var(--background))]",
          "via-background to-[color-mix(in_oklch,var(--accent)_14%,var(--background))]",
          "shadow-[var(--shadow-soft)]",
        )}
      >
        <div className="rounded-[1.4rem] bg-background/80 p-5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border text-2xl shadow-inner"
              aria-hidden
            >
              {mockUser.avatarEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-lg font-semibold text-foreground">
                {mockUser.nickname}
              </p>
              <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                {mockUser.membershipLine}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-muted/15 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-base font-semibold text-foreground">
              Token 用量
            </h2>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              本月累积消耗 / 月度额度
            </p>
          </div>
          <div className="relative">
            <TokenRing pct={usedPct} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-serif text-lg font-semibold leading-none text-foreground">
                {Math.round(usedPct * 100)}%
              </p>
              <p className="mt-1 font-sans text-[10px] text-muted-foreground">
                已用
              </p>
            </div>
          </div>
        </div>

        <p className="mt-2 font-sans text-sm text-foreground">
          <span className="font-semibold text-primary">
            {formatInt(mockTokenUsage.monthlyUsed)}
          </span>
          <span className="text-muted-foreground"> / </span>
          <span>{formatInt(mockTokenUsage.monthlyCap)} 点</span>
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 font-sans text-sm">
          {(
            [
              ["对话", mockTokenUsage.chats, "次"],
              ["生成图", mockTokenUsage.images, "张"],
              ["生成音乐", mockTokenUsage.music, "首"],
              ["视频", mockTokenUsage.videos, "段"],
            ] as const
          ).map(([k, v, unit]) => (
            <div
              key={k}
              className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5"
            >
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {formatInt(v)}
                {unit}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 font-sans text-xs text-foreground">
          距下次额度重置还有{" "}
          <span className="font-semibold text-primary">
            {mockTokenUsage.resetInDays} 天
          </span>
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
          订阅升级
        </h2>
        <div className="flex flex-col gap-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = plan.id === mockUser.tier;
            return (
              <article
                key={plan.id}
                className={cn(
                  "rounded-3xl border p-4 transition-shadow",
                  isCurrent
                    ? "border-primary/45 bg-[color-mix(in_oklch,var(--primary)_8%,var(--background))] shadow-[var(--shadow-soft)]"
                    : "border-border bg-background/70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg font-semibold text-foreground">
                      {plan.name}
                    </p>
                    <p className="mt-0.5 font-sans text-sm font-medium text-primary">
                      {plan.priceLine}
                    </p>
                    <p className="mt-1 font-sans text-xs text-muted-foreground">
                      {plan.quotaLine}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-primary">
                      当前
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => mockUpgrade(plan.name)}
                      className="shrink-0 rounded-full bg-primary px-4 py-2 font-sans text-xs font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
                    >
                      升级
                    </button>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5 font-sans text-xs text-muted-foreground">
                  {plan.perks.map((perk) => (
                    <li key={perk}>· {perk}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-background/80 p-1">
        <div className="rounded-[1.35rem] bg-muted/20 px-4 py-2">
          <h2 className="py-3 font-serif text-base font-semibold text-foreground">
            通用设置
          </h2>

          <div className="border-t border-border/70 py-2">
            <p className="py-2 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              默认字号
            </p>
            <div className="flex flex-wrap gap-2 pb-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setReaderSettings({ fontSize: size })}
                  className={cn(
                    "h-9 min-w-[2.75rem] rounded-xl border px-3 font-sans text-sm font-medium transition-colors",
                    readerSettings.fontSize === size
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/70 py-2">
            <p className="py-2 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              默认主题
            </p>
            <div className="flex flex-wrap gap-2 pb-2">
              {(
                [
                  { id: "light" as const, label: "亮色" },
                  { id: "dark" as const, label: "暗色" },
                  { id: "system" as const, label: "系统" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "h-9 rounded-xl border px-4 font-sans text-sm transition-colors",
                    readerSettings.theme === t.id
                      ? "border-primary bg-primary/15 font-medium text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/70">
            <ToggleRow
              label="默认 BGM"
              description="进入阅读器时是否自动启用氛围音乐条"
              on={readerSettings.bgmEnabled}
              onToggle={() =>
                setReaderSettings({ bgmEnabled: !readerSettings.bgmEnabled })
              }
            />
          </div>

          <div className="border-t border-border/70">
            <ToggleRow
              label="通知"
              description="digest 与实验功能提醒（演示开关，无推送）"
              on={notificationsEnabled}
              onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
            />
          </div>

          <div className="border-t border-border/70 py-2">
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="flex w-full items-center justify-between rounded-xl px-1 py-3 text-left font-sans text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              <span>关于与版本</span>
              <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
            </button>
            <button
              type="button"
              onClick={() => mockSignOut()}
              className="flex w-full items-center justify-between rounded-xl px-1 py-3 text-left font-sans text-sm text-destructive transition-colors hover:bg-destructive/5"
            >
              退出登录
              <span className="text-xs text-muted-foreground">演示</span>
            </button>
          </div>
        </div>
      </section>

      <div className="font-sans text-center text-xs text-muted-foreground">
        3D Bookroom · 商业模式演示界面 · 数据均为本地 Mock
      </div>

      {aboutOpen ? (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="about-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-10 pt-20 backdrop-blur-[1px] sm:items-center"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="about-title" className="font-serif text-lg font-semibold">
              关于
            </h3>
            <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
              本页用于验证会员、额度与订阅叙事的可用性。版本{" "}
              <span className="font-mono text-foreground">{APP_VERSION}</span>
              。正式环境将接入账号系统与合规计费。
            </p>
            <button
              type="button"
              className="font-sans mt-5 h-11 w-full rounded-2xl bg-primary text-sm font-medium text-primary-foreground"
              onClick={() => setAboutOpen(false)}
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}

      <nav className="space-y-2 border-t border-border pt-8 font-sans text-sm">
        <Link
          href="/install"
          className="flex flex-col rounded-2xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
        >
          PWA 安装引导
          <span className="text-xs text-muted-foreground">
            添加到主屏幕步骤预览
          </span>
        </Link>
        <Link
          href="/library"
          className="flex flex-col rounded-2xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
        >
          完整书架
        </Link>
      </nav>
    </div>
  );
}
