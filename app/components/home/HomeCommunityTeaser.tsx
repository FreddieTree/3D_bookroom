"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import {
  mockCommunityImages,
  mockCommunityQuestions,
} from "@/app/lib/mock/community";
import { cn } from "@/app/lib/utils";

const previewQs = mockCommunityQuestions.slice(0, 3);
const previewImgs = mockCommunityImages.slice(0, 6);

export function HomeCommunityTeaser() {
  return (
    <motion.section
      aria-label="共读社区"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="home-community-well px-5 py-8"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <motion.h2
            className="font-serif flex items-center gap-2 text-xl font-bold tracking-tight text-foreground"
          >
            <motion.span
              aria-hidden
              animate={{ rotate: [0, 10, -5, 0], scale: [1, 1.06, 1] }}
              transition={{
                repeat: Infinity,
                duration: 4.2,
                ease: "easeInOut",
              }}
              className="inline-flex"
            >
              ✨
            </motion.span>
            共读社区
          </motion.h2>
          <p className="font-serif mt-1.5 text-sm text-muted-foreground">
            看看大家在读什么
          </p>
        </div>
        <Sparkles
          aria-hidden
          className="mt-2 size-[1rem] shrink-0 text-primary/85"
          strokeWidth={1.75}
        />
      </div>

      <div className="grid gap-5">
        <Link
          href="/community/questions"
          prefetch
          className={cn(
            "group block rounded-[1rem] bg-[color-mix(in_oklch,var(--surface-3)_55%,transparent)] px-5 py-[1.125rem]",
            "transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevation-2)] active:translate-y-0 active:opacity-95",
          )}
        >
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                大家都好奇什么？
              </h3>
              <p className="font-serif mt-1 text-xs text-muted-foreground">
                《小王子》读者问得最多的 3 个问题
              </p>
            </div>
            <ul className="flex flex-col gap-2 pt-2">
              {previewQs.map((q) => (
                <motion.li
                  key={q.id}
                  className="truncate rounded-xl border border-border/60 bg-background/75 px-3 py-2 font-sans text-[0.8rem] text-foreground backdrop-blur-sm"
                  whileHover={{ scale: 1.015 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                >
                  <span className="text-muted-foreground">• </span>
                  {q.excerpt}
                </motion.li>
              ))}
            </ul>
          </div>
        </Link>

        <Link
          href="/community/gallery"
          prefetch
          className={cn(
            "group block rounded-[1rem] bg-[color-mix(in_oklch,var(--surface-4)_42%,transparent)] px-5 py-[1.125rem]",
            "transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevation-2)] active:translate-y-0 active:opacity-95",
          )}
        >
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                100 种小王子的想象
              </h3>
              <p className="font-serif mt-1 text-xs text-muted-foreground">
                读者们生成的画面
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {previewImgs.map((img, i) => (
                <motion.div
                  key={img.id}
                  className="aspect-square overflow-hidden rounded-lg border border-border/50 shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${img.fromGradient}, ${img.toGradient})`,
                  }}
                  initial={{ opacity: 0.75, rotate: i % 2 ? -4 : 3 }}
                  whileHover={{ rotate: i % 2 ? -10 : 8, translateZ: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <div className="flex h-full w-full items-center justify-center text-xl drop-shadow-lg">
                    {img.emoji}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </motion.section>
  );
}
