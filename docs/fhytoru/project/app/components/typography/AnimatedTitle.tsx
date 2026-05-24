"use client";

import { motion } from "framer-motion";

import { cn } from "@/app/lib/utils";

type AnimatedTitleProps = {
  text: string;
  className?: string;
};

/**
 * 标题逐字飘落入场（空格保留为不换行空格）。
 */
export function AnimatedTitle({ text, className }: AnimatedTitleProps) {
  const chars = Array.from(text);

  return (
    <motion.span
      className={cn("inline-block", className)}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.035,
          },
        },
      }}
    >
      {chars.map((char, i) => (
        <motion.span
          key={`ac-${i}`}
          variants={{
            hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { type: "spring", stiffness: 110, damping: 14 },
            },
          }}
          style={{
            display: "inline-block",
            whiteSpace: char === "\n" ? "pre" : undefined,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}
