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
    <div className="flex min-h-dvh justify-center bg-frame" suppressHydrationWarning>
      <div
        className={cn(
          "relative flex min-h-dvh w-full max-w-[430px] flex-col bg-background text-foreground shadow-[var(--shadow-soft)]",
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
