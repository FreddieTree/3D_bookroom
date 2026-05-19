"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";

import { cn } from "@/app/lib/utils";

type BookCoverVtThumbProps = {
  bookId: string;
  coverColor: string;
  coverEmoji?: string | null;
  className?: string;
};

/** 书目详情封面：配合首页书架 layoutId + view-transition-name，跨路由 morph。 */
export function BookCoverVtThumb({
  bookId,
  coverColor,
  coverEmoji,
  className,
}: BookCoverVtThumbProps) {
  const style: CSSProperties = {
    background: coverColor,
    viewTransitionName: `book-cover-${bookId}`,
  };

  return (
    <motion.div
      layoutId={`book-cover-${bookId}`}
      className={cn(
        "flex h-[5.5rem] w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-border text-3xl shadow-[var(--shadow-soft)]",
        className,
      )}
      style={style}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
    >
      {coverEmoji ? <span className="drop-shadow-sm">{coverEmoji}</span> : null}
    </motion.div>
  );
}
