"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BookGridCard } from "@/app/components/home/BookGridCard";
import { cn } from "@/app/lib/utils";
import { BOOKS, type BookMeta } from "@/app/lib/data/books";
import { useAppStore } from "@/app/lib/stores/appStore";

function greetingLabel(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "早上好";
  if (h >= 12 && h < 18) return "下午好";
  return "晚上好";
}

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

export function HomeShelf() {
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId);
  const [scrolled, setScrolled] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const continueBooks = BOOKS.filter((b) => b.progress > 0);

  const showToast = () => {
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2200);
  };

  return (
    <>
      <header
        data-scrolled={scrolled || undefined}
        className={cn(
          "font-sans sticky top-0 z-30 -mx-6 border-b px-6 py-3.5 backdrop-blur-md transition-[box-shadow,background-color,border-color]",
          scrolled
            ? "border-border/80 bg-background/85 shadow-[var(--shadow-soft)]"
            : "border-transparent bg-background/65",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="font-serif block text-[1.35rem] font-semibold leading-none tracking-tight text-foreground">
              活字
            </span>
            <span className="mt-1 block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Living Letters
            </span>
          </Link>
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="设置"
          >
            <Settings className="size-[1.25rem]" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-full flex-1 flex-col px-0 pb-16 pt-8 sm:px-0">
        <section className="mb-14 px-1">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[2.125rem] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-[2.25rem]"
          >
            {greetingLabel()}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="font-sans mt-4 text-lg text-muted-foreground"
          >
            今天想读哪本？
          </motion.p>
        </section>

        {continueBooks.length > 0 ? (
          <section className="mb-14" aria-label="继续阅读">
            <h2 className="font-sans mb-4 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              继续阅读
            </h2>
            <div className="snap-x snap-mandatory -mx-6 flex gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {continueBooks.map((book, i) => (
                <ContinueCard
                  key={book.id}
                  book={book}
                  index={i}
                  onSelect={() => setCurrentBookId(book.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-12" aria-label="我的书架">
          <div className="mb-5 flex items-end justify-between gap-4 px-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
              我的书架
            </h2>
            <Link
              href="/library"
              className="font-sans shrink-0 text-sm font-medium text-primary hover:underline"
            >
              查看全部
            </Link>
          </div>

          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-4 px-0 sm:grid-cols-3"
          >
            {BOOKS.map((book) => (
              <motion.li key={book.id} variants={itemVariants} layout>
                <BookGridCard book={book} />
              </motion.li>
            ))}
          </motion.ul>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="px-1"
        >
          <button
            type="button"
            onClick={showToast}
            className="font-sans w-full rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-6 text-left transition-[transform,background-color] hover:bg-muted/45 active:scale-[0.99]"
          >
            <span className="font-serif text-lg font-semibold text-foreground">
              + 上传你的书
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
              支持 EPUB / TXT，本地预处理后可加入书架（即将上线）。
            </span>
          </button>
        </motion.section>
      </main>

      <AnimatePresence>
        {toastOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="font-sans pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-[var(--shadow-soft)]"
            role="status"
          >
            Coming soon
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ContinueCard({
  book,
  index,
  onSelect,
}: {
  book: BookMeta;
  index: number;
  onSelect: () => void;
}) {
  const pct = Math.round(book.progress * 100);
  return (
    <motion.div
      className="w-[11.25rem] shrink-0 snap-start"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 + 0.12, duration: 0.35 }}
    >
      <Link
        href={`/book/${book.id}/read`}
        onClick={onSelect}
        className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="overflow-hidden rounded-2xl border border-border bg-background shadow-[var(--shadow-soft)]"
        >
          <div
            className="relative flex aspect-[3/4] items-center justify-center rounded-t-2xl text-4xl"
            style={{ background: book.coverColor }}
          >
            {book.coverEmoji ? (
              <span className="drop-shadow-sm">{book.coverEmoji}</span>
            ) : null}
            {!book.isReady ? (
              <span className="font-sans absolute bottom-2 right-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                预处理中
              </span>
            ) : null}
          </div>
          <div className="space-y-2 px-3.5 py-3">
            <p className="font-serif line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-foreground">
              {book.title}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="font-sans text-[0.7rem] font-medium tabular-nums text-muted-foreground">
              继续读 {pct}%
            </p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
