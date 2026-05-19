"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { BookMeta } from "@/app/lib/data/books";
import { useReaderStore } from "@/app/lib/stores/readerStore";

type BookGridCardProps = {
  book: BookMeta;
};

export function BookGridCard({ book }: BookGridCardProps) {
  const setActiveBookId = useReaderStore((s) => s.setActiveBookId);

  return (
    <Link
      href={`/book/${book.id}`}
      prefetch
      onClick={() => setActiveBookId(book.id)}
      className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        layout
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[var(--shadow-soft)]"
      >
        <div
          className="relative flex aspect-[3/4] max-h-[9.5rem] items-center justify-center text-3xl sm:max-h-[10.5rem]"
          style={{ background: book.coverColor }}
        >
          {book.coverEmoji ? <span>{book.coverEmoji}</span> : null}
        </div>
        <div className="flex flex-1 flex-col gap-1 px-2.5 py-3">
          <p className="font-serif line-clamp-2 min-h-[2.5rem] text-[0.8125rem] font-semibold leading-snug text-foreground">
            {book.title}
          </p>
          <p className="font-sans line-clamp-1 text-[0.65rem] text-muted-foreground">
            {book.author}
          </p>
          <p className="font-sans mt-auto text-[0.65rem] tabular-nums text-muted-foreground">
            {book.totalChapters} 章 · 约 {book.estimatedHours}h
          </p>
        </div>
      </motion.div>
    </Link>
  );
}
