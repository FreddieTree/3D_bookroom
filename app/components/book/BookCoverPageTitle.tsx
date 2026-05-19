"use client";

import type { CSSProperties } from "react";

import { AnimatedTitle } from "@/app/components/typography/AnimatedTitle";
import { cn } from "@/app/lib/utils";

type BookCoverPageTitleProps = {
  bookId: string;
  title: string;
  className?: string;
};

export function BookCoverPageTitle({
  bookId,
  title,
  className,
}: BookCoverPageTitleProps) {
  const vt: CSSProperties = {
    viewTransitionName: `book-title-${bookId}`,
    contain: "layout",
  };

  return (
    <h1
      className={cn(
        "font-serif text-[1.65rem] font-semibold leading-tight text-foreground",
        className,
      )}
      style={vt}
    >
      <AnimatedTitle text={title} />
    </h1>
  );
}
