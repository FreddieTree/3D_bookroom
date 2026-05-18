"use client";

import { useAppStore } from "@/app/lib/stores/appStore";
import { useNavigation } from "@/app/lib/hooks/useNavigation";
import { cn } from "@/app/lib/utils";

type BookCoverActionsProps = {
  bookId: string;
  isReady?: boolean;
  className?: string;
};

export function BookCoverActions({
  bookId,
  isReady = true,
  className,
}: BookCoverActionsProps) {
  const { toRead } = useNavigation();
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId);

  return (
    <button
      type="button"
      disabled={!isReady}
      onClick={() => {
        setCurrentBookId(bookId);
        toRead(bookId);
      }}
      className={cn(
        "font-sans mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto",
        className,
      )}
    >
      {isReady ? "开始阅读" : "预处理完成后可读"}
    </button>
  );
}
