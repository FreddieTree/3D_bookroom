"use client";

import { memo } from "react";

import type { Paragraph } from "@/app/lib/data/sample-content";
import { cn } from "@/app/lib/utils";

type ReaderParagraphBlockProps = {
  paragraph: Paragraph;
  pressingId: string | null;
  menuParagraphId: string | null;
  /** 每章第一段首字母 / 首字放大 */
  isLeadParagraph?: boolean;
  /** 外层 article 已通过 style 设置 fontSize — 继承排版类 */
  onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLSpanElement>) => void;
  onPointerEnd: () => void;
};

export const ReaderParagraphBlock = memo(function ReaderParagraphBlock({
  paragraph,
  pressingId,
  menuParagraphId,
  isLeadParagraph = false,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: ReaderParagraphBlockProps) {
  return (
    <p
      id={paragraph.id}
      data-paragraph-id={paragraph.id}
      className={cn(
        "reader-mixed-prose reader-selection-scope",
        isLeadParagraph && "reader-dropcap-first",
        pressingId === paragraph.id && "reader-paragraph-highlight",
        menuParagraphId === paragraph.id && "reader-longpress-paragraph rounded-md",
      )}
      style={{ marginBottom: "1.5em", fontVariantNumeric: "tabular-nums" }}
    >
      <span
        className="cursor-default select-text tabular-nums"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {paragraph.text}
      </span>
    </p>
  );
});
