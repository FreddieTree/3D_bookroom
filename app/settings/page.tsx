"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAppStore } from "@/app/lib/stores/appStore";

/**
 * Legacy `/settings` URL: opens global settings overlay then returns to `/` so the stack stays predictable.
 */
export default function SettingsPage() {
  const router = useRouter();
  const openGlobalSettings = useAppStore((s) => s.openGlobalSettings);

  useEffect(() => {
    queueMicrotask(() => openGlobalSettings());
    router.replace("/", { scroll: false });
  }, [openGlobalSettings, router]);

  return (
    <div className="font-sans flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      正在打开设置…
    </div>
  );
}
