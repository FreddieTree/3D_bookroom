"use client";

import { memo } from "react";

import type { Paragraph } from "@/app/lib/data/sample-content";
import { cn } from "@/app/lib/utils";

type ReaderParagraphBlockProps = {
  paragraph: Paragraph;
  pressingId: string | null;
  menuParagraphId: string | null;
  /** 保留 API；不再使用首字下沉 */
  isLeadParagraph?: boolean;
  /** 该段落是否被书签标记 */
  isBookmarked?: boolean;
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
  isBookmarked = false,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: ReaderParagraphBlockProps) {
  return (
    <p
      id={paragraph.id}
      data-paragraph-id={paragraph.id}
      className={cn(
        "reader-mixed-prose reader-selection-scope relative",
        isLeadParagraph && "reader-dropcap-first",
        isBookmarked && "pl-3",
        pressingId === paragraph.id && "reader-paragraph-highlight",
        menuParagraphId === paragraph.id && "reader-longpress-paragraph rounded-md",
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {isBookmarked ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary"
        />
      ) : null}
      <span
        className="cursor-default select-none tabular-nums"
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
