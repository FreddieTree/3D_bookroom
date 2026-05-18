"use client";

import { useAppStore } from "@/app/lib/stores/appStore";
import { useNavigation } from "@/app/lib/hooks/useNavigation";

type BookCoverActionsProps = {
  bookId: string;
};

export function BookCoverActions({ bookId }: BookCoverActionsProps) {
  const { toRead } = useNavigation();
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId);

  return (
    <button
      type="button"
      onClick={() => {
        setCurrentBookId(bookId);
        toRead(bookId);
      }}
      className="font-sans mt-10 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] active:scale-[0.99] sm:w-auto"
    >
      开始阅读
    </button>
  );
}
