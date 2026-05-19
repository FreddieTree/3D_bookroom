"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { BookGridCard } from "@/app/components/home/BookGridCard";
import { BOOKS } from "@/app/lib/data/books";
import { useBooksCatalog } from "@/app/lib/hooks/useBooksCatalog";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28 },
  },
};

export function LibraryGrid() {
  const books = useBooksCatalog(BOOKS);
  return (
    <main className="mx-auto flex w-full flex-1 flex-col pb-16 pt-4">
      <header className="mb-8 space-y-2">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          全部藏书
        </p>
        <p className="font-serif text-2xl font-semibold text-foreground">完整书架</p>
        <p className="font-sans text-sm text-muted-foreground">
          共 {books.length} 本藏书
        </p>
      </header>

      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
      >
        {books.map((book) => (
          <motion.li key={book.id} variants={itemVariants} layout>
            <BookGridCard book={book} />
          </motion.li>
        ))}
      </motion.ul>

      <nav className="font-sans mt-14 flex flex-col gap-2 border-t border-border pt-10 text-sm">
        <Link
          href="/"
          prefetch
          className="rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
        >
          返回首页书屋
        </Link>
        <Link
          href="/settings"
          prefetch
          className="rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
        >
          设置
        </Link>
        <Link
          href="/install"
          prefetch
          className="rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-muted"
        >
          PWA 安装引导
        </Link>
      </nav>
    </main>
  );
}
