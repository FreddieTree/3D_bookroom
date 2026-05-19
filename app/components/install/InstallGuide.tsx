"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Share, Smartphone } from "lucide-react";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { cn } from "@/app/lib/utils";
import { useAppStore } from "@/app/lib/stores/appStore";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isWeChat(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function InstallGuide() {
  const router = useRouter();
  const openGlobalSettings = useAppStore((s) => s.openGlobalSettings);
  const [weChat] = useState(() => isWeChat());
  const [installCelebration, setInstallCelebration] = useState<
    "idle" | "progress" | "done"
  >("idle");
  const hiddenAt = useRef<number | null>(null);
  const celebrationPhaseRef = useRef(installCelebration);
  const celebrationTimers = useRef<number[]>([]);

  useEffect(() => {
    celebrationPhaseRef.current = installCelebration;
  }, [installCelebration]);

  useEffect(() => {
    if (isStandalone()) {
      router.replace("/");
    }
  }, [router]);

  const clearCelebrationTimers = useCallback(() => {
    celebrationTimers.current.forEach((id) => window.clearTimeout(id));
    celebrationTimers.current = [];
  }, []);

  const onVisibility = useCallback(() => {
    if (document.visibilityState !== "visible") {
      hiddenAt.current = Date.now();
      return;
    }
    const leftAt = hiddenAt.current;
    hiddenAt.current = null;
    if (
      !leftAt ||
      Date.now() - leftAt < 800 ||
      celebrationPhaseRef.current !== "idle"
    ) {
      return;
    }
    clearCelebrationTimers();
    setInstallCelebration("progress");
    celebrationTimers.current.push(
      window.setTimeout(() => setInstallCelebration("done"), 900),
      window.setTimeout(() => router.replace("/"), 2100),
    );
  }, [router, clearCelebrationTimers]);

  useEffect(() => {
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearCelebrationTimers();
    };
  }, [onVisibility, clearCelebrationTimers]);

  return (
    <MobileContainer>
      <main className="mx-auto flex w-full flex-1 flex-col px-5 pb-28 pt-4 sm:px-7">
        <header className="mb-8 space-y-3 text-center">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Progressive Web App
          </p>
          <h1 className="font-serif text-[1.65rem] font-semibold leading-tight text-foreground">
            添加「三维书屋」到主屏幕
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            15 秒，获得 App 体验
          </p>
        </header>

        {weChat ? (
          <section className="mb-10 rounded-3xl border border-amber-500/35 bg-amber-500/10 p-5 text-left">
            <p className="font-sans text-sm font-medium text-foreground">
              微信内置浏览器无法直接安装 PWA
            </p>
            <p className="font-sans mt-2 text-sm leading-relaxed text-muted-foreground">
              请点击右上角菜单，选择「在 Safari 中打开」，然后按下方步骤添加。
            </p>
            <button
              type="button"
              onClick={() =>
                window.alert(
                  "请点击微信右上角「···」，选择「用 Safari 打开」或「在浏览器中打开」，然后再按步骤添加主屏幕。",
                )
              }
              className="font-sans mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              请用 Safari 打开
              <ExternalLink className="size-4" strokeWidth={1.75} />
            </button>
          </section>
        ) : (
          <>
            <ol className="mb-10 space-y-6 font-sans text-[0.9375rem] leading-relaxed text-foreground">
              <StepWithImage
                n={1}
                title="点击底部分享按钮"
                caption="Safari 工具栏右侧的方形箭头 ⬆︎"
                src="/install/step-share.png"
                icon={Share}
              />
              <StepWithImage
                n={2}
                title="滚动找到「添加到主屏幕」"
                caption="在分享面板中向下滑动即可看到"
                src="/install/step-add.png"
                icon={Smartphone}
              />
              <StepWithImage
                n={3}
                title="点击「添加」，完成"
                caption="可从主屏幕图标全屏启动三维书屋"
                src="/install/step-done.png"
                icon={Smartphone}
              />
            </ol>

            <p className="font-sans mb-10 text-center text-xs leading-relaxed text-muted-foreground">
              安装流程因 iOS 版本略有差异；若看不到选项，请确认使用 Safari 且站点为
              HTTPS。
            </p>
          </>
        )}

        <nav className="mt-auto space-y-3 border-t border-border pt-8">
          <Link
            href="/"
            prefetch
            className="font-sans flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            先逛逛首页
          </Link>
          <button
            type="button"
            className="font-sans flex h-12 w-full items-center justify-center rounded-2xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={() => openGlobalSettings()}
          >
            设置
          </button>
        </nav>
      </main>

      <AnimatePresence>
        {installCelebration !== "idle" ? (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] backdrop-blur-[1px] sm:items-center sm:pb-12"
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-sm rounded-[1.35rem] border border-border bg-background px-6 py-8 text-center shadow-2xl"
            >
              {installCelebration === "progress" ? (
                <>
                  <p className="font-serif text-lg font-semibold text-foreground">
                    安装中…
                  </p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: "8%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </>
              ) : (
                <p className="font-serif text-lg font-semibold text-foreground">
                  添加成功 ✨
                </p>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MobileContainer>
  );
}

function StepWithImage({
  n,
  title,
  caption,
  src,
  icon: Icon,
}: {
  n: number;
  title: string;
  caption: string;
  src: string;
  icon: typeof Share;
}) {
  return (
    <li className="rounded-3xl border border-border/80 bg-muted/15 p-4 shadow-sm">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
          {n}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
        </div>
        <Icon
          className="ml-auto size-5 shrink-0 text-primary/80"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      <div
        className={cn(
          "relative mt-4 overflow-hidden rounded-2xl border border-border/60 bg-background",
        )}
      >
        <Image
          src={src}
          alt=""
          width={320}
          height={200}
          className="h-auto w-full object-cover"
          sizes="(max-width:430px) 85vw, 320px"
          priority={n === 1}
        />
      </div>
    </li>
  );
}
