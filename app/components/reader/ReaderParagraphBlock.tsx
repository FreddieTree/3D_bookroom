"use client";

import { memo } from "react";

import type { Paragraph } from "@/app/lib/data/sample-content";
import { cn } from "@/app/lib/utils";

type ReaderParagraphBlockProps = {
  paragraph: Paragraph;
  pressingId: string | null;
  menuParagraphId: string | null;
  onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLSpanElement>) => void;
  onPointerEnd: () => void;
};

export const ReaderParagraphBlock = memo(function ReaderParagraphBlock({
  paragraph,
  pressingId,
  menuParagraphId,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: ReaderParagraphBlockProps) {
  return (
    <p
      id={paragraph.id}
      data-paragraph-id={paragraph.id}
      className={cn(
        pressingId === paragraph.id && "reader-paragraph-highlight",
        menuParagraphId === paragraph.id && "reader-longpress-paragraph rounded-md",
      )}
      style={{ marginBottom: "1.5em" }}
    >
      <span
        className="cursor-default select-text"
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
