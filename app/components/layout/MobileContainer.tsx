import type { ReactNode } from "react";

import { cn } from "@/app/lib/utils";

type MobileContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Mobile-first shell: full width on phones; on large screens, a centered 430px column
 * with themed side gutters. Safe areas + dynamic viewport height for iOS PWA.
 */
export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className="study-room-gutter flex min-h-dvh justify-center">
      <div
        className={cn(
          "relative flex min-h-dvh w-full max-w-[430px] flex-col bg-background text-foreground",
          "shadow-[var(--shadow-elevation-3)]",
          "min-[481px]:my-10 min-[481px]:min-h-[calc(100dvh-5rem)] min-[481px]:max-h-[min(100dvh-5rem,900px)] min-[481px]:overflow-y-auto min-[481px]:rounded-[1.65rem] min-[481px]:ring min-[481px]:ring-black/14 min-[481px]:[scrollbar-gutter:stable] dark:min-[481px]:ring-white/10",
          "pt-[max(env(safe-area-inset-top),0px)]",
          "pb-[max(env(safe-area-inset-bottom),0px)]",
          "pl-[max(env(safe-area-inset-left),0px)]",
          "pr-[max(env(safe-area-inset-right),0px)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
