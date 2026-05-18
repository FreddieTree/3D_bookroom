"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { cn } from "@/app/lib/utils";

type PageHeaderProps = {
  title?: string;
  /** If set, back chevron navigates here; otherwise uses router.back(). */
  backHref?: string;
  right?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  backHref,
  right,
  className,
}: PageHeaderProps) {
  const { back } = useNavigation();

  return (
    <header
      className={cn(
        "font-sans flex h-12 shrink-0 items-center gap-2 px-1",
        className,
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          aria-label="返回"
        >
          <ChevronLeft className="size-6" strokeWidth={1.75} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => back()}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          aria-label="返回"
        >
          <ChevronLeft className="size-6" strokeWidth={1.75} />
        </button>
      )}
      {title ? (
        <p className="line-clamp-1 flex-1 text-center text-base font-semibold tracking-tight text-foreground">
          {title}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex min-h-11 min-w-11 items-center justify-end">
        {right ?? <span className="inline-block min-w-11" aria-hidden />}
      </div>
    </header>
  );
}
