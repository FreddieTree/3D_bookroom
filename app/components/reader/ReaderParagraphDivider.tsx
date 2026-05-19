"use client";

import { memo } from "react";

const GLYPHS = ["❀", "❦", "✦", "‧", "‧"] as const;

export function pickParagraphOrnament(
  paragraphIndex: number,
  paragraphId: string,
): string | null {
  if (paragraphIndex <= 0) return null;
  let h = 0;
  for (let i = 0; i < paragraphId.length; i += 1) {
    h = (h * 31 + paragraphId.charCodeAt(i)) >>> 0;
  }
  const mod = paragraphIndex % 4;
  if (mod !== h % 4) return null;
  return GLYPHS[h % GLYPHS.length] ?? "✦";
}

export const ReaderParagraphDivider = memo(function ReaderParagraphDivider({
  symbol,
}: {
  symbol: string;
}) {
  return (
    <p className="font-serif flex justify-center py-2 opacity-82" aria-hidden>
      <span className="reader-paragraph-divider-line text-[0.92rem]">
        {symbol}
      </span>
    </p>
  );
});
