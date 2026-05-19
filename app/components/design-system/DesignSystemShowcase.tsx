"use client";

import { motion } from "framer-motion";

import {
  fadeUpVariants,
  spring,
} from "@/app/lib/animations";
import { haptics } from "@/app/lib/haptics";

/** 首页底部 · 临时设计令牌验收区（可随时移除） */
export function DesignSystemShowcase() {
  return (
    <section
      className="font-sans relative mt-10 border-t border-border/60 pb-28 pt-8"
      aria-label="Design system QA"
    >
      <motion.div
        className="mb-6"
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Design QA
        </p>
        <h2 className="font-serif mt-2 text-xl font-semibold tracking-tight text-foreground">
          OKLCH · Physics · Fonts
        </h2>
      </motion.div>

      <motion.div
        className="texture-noise material-paper rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-ambient-2)]"
        variants={fadeUpVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <p className="text-[0.7rem] font-medium text-muted-foreground">
          Surface 0–5
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={`s-${String(i)}`}
              className="flex aspect-[4/3] flex-col justify-end rounded-lg border border-border/40 p-2 text-[0.6rem] text-secondary"
              style={{
                background: `var(--surface-${String(i)})`,
              }}
            >
              <span className="font-mono-nums opacity-80">{String(i)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="texture-noise rounded-2xl border border-border/50 p-4">
          <p className="mb-3 text-[0.7rem] font-medium text-muted-foreground">
            Shadow ambient 1→4
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["1", "--shadow-ambient-1"],
                ["2", "--shadow-ambient-2"],
                ["3", "--shadow-ambient-3"],
                ["4", "--shadow-ambient-4"],
              ] as const
            ).map(([label, cssVar]) => (
              <div
                key={label}
                className="rounded-xl bg-muted/35 p-3"
                style={{ boxShadow: `var(${cssVar})` }}
              >
                <div className="h-14 rounded-lg bg-background/90" />
                <p className="font-mono-nums mt-2 text-[0.6rem] text-muted-foreground">
                  {cssVar}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[0.7rem] font-medium text-muted-foreground">
            Materials（加噪 overlay）
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="texture-noise material-paper rounded-xl p-4 text-xs">
              paper
            </div>
            <div className="texture-noise material-emboss rounded-xl p-4 text-xs">
              emboss
            </div>
            <div className="texture-noise rounded-xl border border-white/35 p-4 text-xs text-foreground">
              glass
            </div>
            <div className="texture-noise rounded-xl border border-white/25 p-4 text-xs text-zinc-200">
              <div className="material-glass-dark rounded-lg p-2">glass-dark</div>
            </div>
          </div>
        </div>
      </div>

      <div className="texture-noise material-wood relative mt-6 overflow-hidden rounded-2xl p-4 shadow-[var(--shadow-ambient-2)]">
        <p className="relative z-[2] mb-4 text-[0.7rem] font-medium text-amber-950/85 dark:text-amber-100/90">
          wood + spring 按钮（轻触触感）
        </p>
        <div className="relative z-[2] flex flex-wrap gap-3">
          {(["standard", "bouncy"] as const).map((k) => (
            <motion.button
              key={k}
              type="button"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-ambient-2)] ds-spring-hit"
              whileHover={{ scale: 1.02 }}
              whileTap={{
                scale: 0.98,
                transition: spring.snappy,
              }}
              transition={spring.standard}
              onPointerDown={() => haptics.medium()}
              onPointerUp={() => haptics.light()}
            >
              {k}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/50 bg-muted/25 p-4">
        <p className="text-[0.7rem] font-medium text-muted-foreground">
          Fonts
        </p>
        <p className="font-serif-en mt-2 text-lg text-foreground">
          Serif EN — Reading flows in rhythm.
        </p>
        <p className="font-serif-zh mt-3 text-[1rem] leading-relaxed text-foreground">
          中文衬线：三维书屋正文与首字下沉测试。
        </p>
        <p className="font-sans mt-3 text-sm text-muted-foreground">
          UI Sans 0123456789 与&nbsp;
          <span className="font-mono-nums tabular-nums text-foreground">
            89.412
          </span>
          &nbsp;等宽数字
        </p>
      </div>
    </section>
  );
}
