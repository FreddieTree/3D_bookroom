"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";

import { ContinueReadingCard } from "@/app/components/home/ContinueReadingCard";
import { HomeCommunityTeaser } from "@/app/components/home/HomeCommunityTeaser";
import { ShelfBook3D } from "@/app/components/home/ShelfBook3D";
import { BOOKS, getHomepageShelfBooks } from "@/app/lib/data/books";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { effectiveReadingFraction } from "@/app/lib/utils/reading-progress";
import { cn } from "@/app/lib/utils";
import { useReaderStore } from "@/app/lib/stores/readerStore";

function greetingLabel(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "早上好";
  if (h >= 12 && h < 18) return "下午好";
  return "晚上好";
}

const sectionReveal = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.095,
      delayChildren: 0.06,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export function HomeShelf() {
  const { toSettings } = useNavigation();
  const progressByBook = useReaderStore((s) => s.progressByBook);
  const [scrolled, setScrolled] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const shelfViewport = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: shelfViewport,
    offset: ["start end", "end start"],
  });
  const shelfY = useTransform(scrollYProgress, [0, 1], [26, -22]);

  const continueBooks = useMemo(() => {
    const enriched = BOOKS.map((book) => {
      const frac = effectiveReadingFraction(
        book,
        progressByBook[book.id],
      );
      return { book, frac };
    }).filter(({ frac }) => frac > 0);
    enriched.sort((a, b) => b.frac - a.frac);
    return enriched;
  }, [progressByBook]);

  const shelfBooks = useMemo(() => getHomepageShelfBooks(), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showToast = () => {
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2400);
  };

  return (
    <>
      <header
        data-scrolled={scrolled || undefined}
        className={cn(
          "font-sans sticky top-0 z-40 -mx-6 border-b px-6 backdrop-blur-md transition-[box-shadow,background-color,border-color]",
          scrolled
            ? "border-border/80 bg-background/88 shadow-[var(--shadow-soft)]"
            : "border-transparent bg-background/76",
          "pb-3 pt-[max(4px,_env(safe-area-inset-top))]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pt-3">
            <p className="font-serif text-[1.925rem] font-bold leading-none tracking-[0.01em] text-foreground">
              三维书屋
            </p>
            <p className="font-serif mt-2 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[0.68rem]">
              3D Bookroom · AI 沉浸式阅读伴侣
            </p>
          </div>
          <button
            type="button"
            className="mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="设置"
            onClick={() => toSettings()}
          >
            <Settings className="size-[1.25rem]" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <motion.main
        variants={sectionReveal}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-full flex-1 flex-col pb-20 pt-[1.375rem]"
      >
        <motion.section
          variants={fadeUp}
          className="mb-14 px-1"
          aria-label="问候"
        >
          <motion.h1
            className="font-serif text-[clamp(2.375rem,_6.5vw,_2.825rem)] font-semibold leading-[1.1] tracking-tight text-foreground"
            layout
          >
            {greetingLabel()}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="font-serif mt-5 text-xl text-muted-foreground sm:text-[1.275rem]"
          >
            今天想读哪本？
          </motion.p>
        </motion.section>

        {continueBooks.length > 0 ? (
          <motion.section
            variants={fadeUp}
            className="mb-16"
            aria-label="继续阅读"
          >
            <h2 className="font-sans mb-4 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              继续阅读
            </h2>
            <div className="snap-x snap-mandatory -mx-6 flex gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {continueBooks.map(({ book, frac }, i) => (
                <ContinueReadingCard
                  key={book.id}
                  book={book}
                  pct={frac * 100}
                  index={i}
                />
              ))}
            </div>
          </motion.section>
        ) : null}

        <motion.section
          ref={(n) => {
            shelfViewport.current = n;
          }}
          variants={fadeUp}
          className="mb-16"
          aria-label="我的书屋"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
            <h2 className="font-serif text-[1.45rem] font-bold tracking-tight text-foreground">
              我的书屋
            </h2>
            <Link
              href="/library"
              prefetch
              className="font-sans shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              查看全部
            </Link>
          </div>

          <motion.div style={{ y: shelfY }} className="will-change-transform">
            <div className="home-bookshelf-pane p-6 sm:p-7">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
                {shelfBooks.map((book, idx) => (
                  <ShelfBook3D key={book.id} book={book} index={idx} />
                ))}
                <li className="col-span-2 flex justify-center pt-6 sm:col-span-3 sm:pt-8">
                  <ShelfBook3DPlaceholder />
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.section>

        <motion.section variants={fadeUp} className="mb-12 px-1">
          <HomeCommunityTeaser />
        </motion.section>

        <motion.section variants={fadeUp} className="px-1">
          <button
            type="button"
            onClick={showToast}
            className="font-serif w-full rounded-[1rem] bg-[color-mix(in_oklch,var(--surface-2)_90%,transparent)] px-6 py-[1.35rem] text-left shadow-[var(--shadow-elevation-1)] outline-none transition-[transform,box-shadow] hover:shadow-book active:translate-y-[1px]"
          >
            <span className="block text-xl font-bold text-foreground">
              + 上传你的书
            </span>
            <span className="font-serif mt-2 block text-[0.9rem] text-muted-foreground">
              支持 EPUB · TXT · PDF
            </span>
          </button>
        </motion.section>
      </motion.main>

      <AnimatePresence>
        {toastOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed bottom-[max(1.75rem,_env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[min(22rem,_90vw)] -translate-x-1/2 rounded-full bg-foreground px-6 py-2.5 text-center font-sans text-sm font-semibold text-background shadow-[var(--shadow-elevation-3)]"
            role="status"
          >
            敬请期待 · 书目预处理即将解锁
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** 占位加号格子，与三本展示形成「书架空位」感 */
function ShelfBook3DPlaceholder() {
  return (
    <div className="w-full max-w-[12.5rem]">
      <div className="flex h-[180px] w-full items-center justify-center rounded-2xl border border-dashed border-border/85 bg-muted/35 text-muted-foreground shadow-inner backdrop-blur-[1px]">
        <span className="font-serif text-[2rem] leading-none opacity-72">＋</span>
      </div>
    </div>
  );
}
