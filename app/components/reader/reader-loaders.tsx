"use client";

import { motion } from "framer-motion";

/** 三根「脊椎」占位加载 */
export function ReaderSpineLoading() {
  return (
    <div
      className="flex h-36 items-center justify-center gap-3"
      role="progressbar"
      aria-label="正在加载正文"
      aria-busy="true"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-24 w-1.5 overflow-hidden rounded-full bg-muted dark:bg-muted/65"
          style={{ opacity: 0.75 }}
          aria-hidden
        >
          <motion.div
            className="size-full rounded-full bg-primary/75"
            initial={{ scaleY: 0.06, opacity: 0.25 }}
            animate={{
              scaleY: [0.06, 1, 0.08],
              opacity: [0.25, 0.92, 0.28],
              y: [-10, 0, 12],
            }}
            transition={{
              duration: 1.85,
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: 0.06,
              delay: i * 0.26,
            }}
            style={{ transformOrigin: "50% 100%" }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/** 三个汉字依次轻跳 — 通用 loading copy */
export function ReaderBouncingLabel({ chars }: { chars: [string, string, string] }) {
  const [a, b, c] = chars;
  return (
    <p
      className="flex items-center justify-center gap-[0.42em] font-serif text-xl font-semibold text-muted-foreground"
      aria-live="polite"
    >
      {[a, b, c].map((ch, i) => (
        <motion.span
          key={`${ch}-${String(i)}`}
          aria-hidden
          animate={{ y: [0, -6, 0], opacity: [0.72, 1, 0.72] }}
          transition={{
            duration: 1.08,
            ease: [0.22, 1, 0.36, 1],
            repeat: Infinity,
            repeatDelay: 0.06,
            delay: i * 0.22,
          }}
        >
          {ch}
        </motion.span>
      ))}
    </p>
  );
}
