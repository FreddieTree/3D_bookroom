"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";

import { Card3D } from "@/app/components/ui/Card3D";
import type { BookMeta } from "@/app/lib/data/books";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { useReaderStore } from "@/app/lib/stores/readerStore";
import { cn } from "@/app/lib/utils";

type ShelfBook3DProps = {
  book: BookMeta;
  index: number;
  /** 正在「抽出」某一本书时，其余书退后虚化 */
  shelfFocusPeerId: string | null;
  /** 该书开始飞出动画的瞬间回调 */
  onShelfPeerFocus?: (bookId: string) => void;
};

function ShelfBook3DInner({
  book,
  index,
  shelfFocusPeerId,
  onShelfPeerFocus,
}: ShelfBook3DProps) {
  const { toBook } = useNavigation();
  const setActiveBookId = useReaderStore((s) => s.setActiveBookId);
  const [pulling, setPulling] = useState(false);

  const othersRecess =
    shelfFocusPeerId !== null && shelfFocusPeerId !== book.id;

  const go = () => {
    onShelfPeerFocus?.(book.id);
    setPulling(true);
    window.setTimeout(() => {
      setActiveBookId(book.id);
      toBook(book.id);
    }, 380);
  };

  const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

  return (
    <motion.li
      layout
      className={cn(
        "list-none",
        pulling && "[&_*]:pointer-events-none pointer-events-none",
      )}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 30,
        delay: index * 0.085,
      }}
      animate={{
        opacity: othersRecess ? 0.48 : 1,
        scale: othersRecess ? 0.96 : pulling ? 1 : 1,
        filter: othersRecess ? "blur(3px)" : "blur(0px)",
      }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="perspective-mid w-full preserve-3d"
        animate={
          pulling
            ? {
                rotateY: -14,
                x: -10,
                translateZ: 52,
              }
            : {
                rotateY: 0,
                x: 0,
                translateZ: 0,
              }
        }
        transition={{ duration: 0.42, ease }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.button
          type="button"
          onClick={() => {
            if (pulling) return;
            go();
          }}
          className={cn(
            "block w-full touch-manipulation text-left rounded-2xl",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          whileHover={
            pulling
              ? undefined
              : {
                  rotateY: 8,
                  translateZ: 22,
                  boxShadow:
                    "0 20px 40px -14px rgb(50 42 30 / 0.45)",
                }
          }
          whileTap={
            pulling
              ? undefined
              : {
                  scale: 0.985,
                }
          }
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
        >
          <Card3D depth={4} enableTilt={false} className={cn("h-[180px] overflow-hidden rounded-2xl")}>
            <div className="flex h-full flex-col">
              <div className="relative h-[70%] w-full shrink-0 overflow-hidden bg-muted/35">
                <div
                  className="preserve-3d perspective-mid absolute inset-0 flex items-center justify-center"
                  style={{ perspective: "900px" }}
                >
                  <motion.div
                    layoutId={`book-cover-${book.id}`}
                    className="relative flex h-full w-[78%] max-w-[7.75rem] items-center justify-center rounded-l-md rounded-r-sm text-[clamp(2.25rem,_9vw,_2.85rem)] shadow-[var(--shadow-elevation-2)] preserve-3d border-y border-r border-black/14"
                    style={{
                      rotateY: -10,
                      transformStyle: "preserve-3d",
                      background: book.coverColor,
                      boxShadow:
                        "-8px 0 18px -6px rgb(0 0 0 / 0.35), inset -3px 0 0 rgb(0 0 0 / 0.15)",
                      viewTransitionName: `book-cover-${book.id}`,
                    }}
                  >
                    {book.coverEmoji ? (
                      <span className="drop-shadow-md">{book.coverEmoji}</span>
                    ) : null}
                  </motion.div>
                </div>
                {!book.isReady ? (
                  <span className="font-sans absolute bottom-2 right-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground shadow-sm">
                    预处理中
                  </span>
                ) : null}
              </div>
              <div className="flex h-[30%] min-h-[3.125rem] flex-col justify-center gap-0.5 border-t border-border/60 px-3 py-2">
                <p className="font-serif line-clamp-2 text-[0.8rem] font-semibold leading-snug">
                  {book.title}
                </p>
                <p className="font-sans line-clamp-1 text-[0.65rem] text-muted-foreground">
                  {book.author}
                </p>
              </div>
            </div>
          </Card3D>
        </motion.button>
      </motion.div>
    </motion.li>
  );
}

export const ShelfBook3D = memo(ShelfBook3DInner);
