"use client";

import { motion } from "framer-motion";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { mockCommunityQuestions } from "@/app/lib/mock/community";

export default function CommunityQuestionsPage() {
  return (
    <MobileContainer>
      <div className="px-6 pb-16 sm:px-8">
        <PageHeader title="共问墙" backHref="/" />
        <p className="font-serif mx-1 mb-10 mt-3 text-[0.9rem] leading-relaxed text-muted-foreground">
          共读社区占位页：汇集了读者们提出的问题缩略，
          《小王子》《1984》《老人与海》将陆续接入真实信息流。
        </p>
        <ol className="mx-2 space-y-4">
          {mockCommunityQuestions.map((q, idx) => (
            <motion.li
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04, duration: 0.38 }}
              className="rounded-[1rem] bg-[color-mix(in_oklch,var(--surface-2)_65%,transparent)] px-5 py-[1.12rem]"
            >
              <p className="font-serif font-semibold text-foreground">
                {(idx + 1).toString().padStart(2, "0")}.{" "}
                <span>{q.bookHint}</span>
              </p>
              <p className="font-serif mt-2 text-[0.9rem] leading-relaxed text-foreground">
                「{q.excerpt}」
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </MobileContainer>
  );
}
