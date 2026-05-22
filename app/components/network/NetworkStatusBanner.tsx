"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { WifiOff } from "lucide-react";

/**
 * 顶部弱提示：离线时显示（不阻断页面；Workbox 仍可提供缓存页）。
 */
export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-auto fixed left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex w-[min(calc(100vw-1.5rem),430px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 text-left shadow-[var(--shadow-soft)] backdrop-blur-md"
        >
          <WifiOff className="size-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm font-medium text-foreground">
              网络不可用
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              部分功能依赖联网；可尝试已缓存页面。
            </p>
            <Link
              href="/offline"
              className="font-sans mt-1 inline-block text-xs font-medium text-primary hover:underline"
            >
              离线说明
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
