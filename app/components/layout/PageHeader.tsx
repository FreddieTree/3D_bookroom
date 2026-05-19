"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { cn } from "@/app/lib/utils";

type PageHeaderProps = {
  title?: string;
  subtitle?: string;
  /** Replaces stacked title/subtitle when provided */
  center?: ReactNode;
  /** If set, back chevron uses Link (still compatible with SPA) */
  backHref?: string;
  /** When true header shows shadow + contrasting border — e.g. after scroll */
  elevated?: boolean;
  /** Uses static top bar (covers reader overlay). Default: sticky shelf header. */
  sticky?: boolean;
  right?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  center,
  backHref,
  elevated,
  sticky = true,
  right,
  className,
}: PageHeaderProps) {
  const { back } = useNavigation();

  return (
    <header
      className={cn(
        "font-sans z-30 shrink-0 border-b backdrop-blur-md transition-[box-shadow,background-color,border-color]",
        sticky ? "sticky top-0" : "relative",
        elevated
          ? "border-border/80 bg-background/88 shadow-[var(--shadow-soft)]"
          : "border-border/60 bg-background/80",
        "min-h-11 pb-0 pt-[max(0px,env(safe-area-inset-top))]",
        className,
      )}
    >
      <div className={cn("flex h-11 max-h-11 items-center gap-1 px-1")}>
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            aria-label="返回"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => back()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            aria-label="返回"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} />
          </button>
        )}

        {center ? (
          <div className="min-h-11 min-w-0 flex-1 px-1">{center}</div>
        ) : title || subtitle ? (
          <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center px-1 text-center">
            {subtitle ? (
              <p className="line-clamp-1 text-[0.7rem] font-semibold leading-tight text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            <p className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
              {title}
            </p>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-end">
          {right ?? <span className="inline-block min-w-11" aria-hidden />}
        </div>
      </div>
    </header>
  );
}
