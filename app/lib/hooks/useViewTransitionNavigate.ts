"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { withViewTransition } from "@/app/lib/startViewTransition";

type PushOptions = { scroll?: boolean };

/**
 * SPA 跳转包一层 View Transition（不支持时退回普通 navigate）。
 */
export function useViewTransitionNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string, opts?: PushOptions) => {
      withViewTransition(() => {
        router.push(href, opts);
      });
    },
    [router],
  );
}
