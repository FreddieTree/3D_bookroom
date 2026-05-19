"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Card3D } from "@/app/components/ui/Card3D";
import type { BookMeta } from "@/app/lib/data/books";
import { useReaderStore } from "@/app/lib/stores/readerStore";
import { cn } from "@/app/lib/utils";

type ContinueReadingCardProps = {
  book: BookMeta;
  pct: number;
  index: number;
};

/** 首页「继续阅读」横滑大卡：280×160，左 3D 封面 + 右侧进度 */
export function ContinueReadingCard({
  book,
  pct,
  index,
}: ContinueReadingCardProps) {
  const setActiveBookId = useReaderStore((s) => s.setActiveBookId);
  const p = Math.min(100, Math.max(0, Math.round(pct)));

  return (
    <motion.div
      className="w-[280px] shrink-0 snap-start"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{
        duration: 0.38,
        delay: index * 0.06 + 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/book/${book.id}/read`}
        prefetch
        onClick={() => setActiveBookId(book.id)}
        className={cn(
          "block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <motion.div
          whileHover={{ y: -4, rotateX: -1 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
        >
          <Card3D
            depth={3}
            enableTilt={false}
            className={cn(
              "h-[160px] overflow-hidden rounded-[1rem] shadow-book",
              "bg-[var(--surface-2)]",
            )}
          >
            <div className="flex h-full gap-3 p-[0.65rem]">
              <div className="perspective-mid shrink-0 self-center preserve-3d">
                <motion.div
                  className="preserve-3d"
                  initial={false}
                  whileHover={{
                    rotateY: -14,
                  }}
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  style={{
                    transformOrigin: "right center",
                    boxShadow:
                      "-6px 0 14px -4px rgb(0 0 0 / 0.32), inset -2px 0 0 rgb(0 0 0 / 0.12)",
                  }}
                >
                  <div
                    className="flex h-[7.25rem] w-[5.85rem] items-center justify-center rounded-l-md rounded-r-sm border-y border-r border-black/14 text-[2rem]"
                    style={{ background: book.coverColor }}
                  >
                    <span aria-hidden>{book.coverEmoji}</span>
                  </div>
                </motion.div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 pr-0.5">
                <p className="font-serif line-clamp-2 text-[1.05rem] font-bold leading-tight tracking-tight text-foreground">
                  {book.title}
                </p>
                <div className="space-y-1.5">
                  <div className="h-1 overflow-hidden rounded-full bg-muted dark:bg-muted/65">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <p className="font-sans text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
                    继续读 {p}%
                  </p>
                </div>
              </div>
            </div>
          </Card3D>
        </motion.div>
      </Link>
    </motion.div>
  );
}
