"use client";

import { motion } from "framer-motion";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { mockCommunityImages } from "@/app/lib/mock/community";

export default function CommunityGalleryPage() {
  const gridItems = [...mockCommunityImages].slice(0, 12);

  return (
    <MobileContainer>
      <div className="px-6 pb-20 sm:px-8">
        <PageHeader title="共生成画廊" backHref="/" />
        <p className="font-serif mx-1 mb-12 mt-3 max-w-xl text-[0.92rem] leading-relaxed text-muted-foreground">
          共读社区占位页：展示读者们用文字想象出的段落画面占位图。
          正式版将挂载真实预览与画师署名。
        </p>
        <div className="mx-1 grid grid-cols-2 gap-[0.875rem] sm:grid-cols-3">
          {gridItems.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0.12, rotate: i % 2 ? -8 : 5 }}
              whileInView={{ opacity: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-elevation-2)]"
              style={{
                background: `linear-gradient(146deg, ${img.fromGradient} 24%, ${img.toGradient} 124%)`,
              }}
            >
              <div className="flex size-full flex-col justify-between px-5 py-[1.125rem] text-primary-foreground/95">
                <span className="font-serif text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-black/76 dark:text-neutral-950/92">
                  #{(i + 1).toString().padStart(2, "0")}
                </span>
                <span className="flex flex-1 items-center justify-center text-[2rem] opacity-93 drop-shadow-sm">
                  {img.emoji}
                </span>
                <span className="font-serif text-[0.65rem] text-black/70 dark:text-neutral-950/80">
                  Mock 渐变占位
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MobileContainer>
  );
}
