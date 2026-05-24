"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/app/lib/utils";

function RollingDigit({ digit }: { digit: number }) {
  const reduce = useReducedMotion();
  const d = ((digit % 10) + 10) % 10;

  return (
    <span className="relative inline-grid h-[1em] overflow-hidden align-baseline">
      <motion.span
        className="flex flex-col leading-none tabular-nums"
        initial={false}
        animate={{ y: `${-d}em` }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 360, damping: 34 }
        }
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            className="flex h-[1em] min-w-[0.58em] items-center justify-center"
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

type RollingNumberProps = {
  value: number;
  className?: string;
  minDigits?: number;
};

/** 数位上下滚动到目标整数（移动端注意不宜同时大量使用）。 */
export function RollingNumber({ value, className, minDigits = 1 }: RollingNumberProps) {
  const n = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const raw = `${n}`;
  const chars =
    raw.length < minDigits ? raw.padStart(minDigits, "0") : raw;
  const digits = chars.split("").map((c) => Number.parseInt(c, 10));

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      {digits.map((digit, i) => (
        <RollingDigit key={`${chars.length}-${i}`} digit={digit} />
      ))}
    </span>
  );
}
