"use client";

import { Map } from "lucide-react";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { useNavigation } from "@/app/lib/hooks/useNavigation";

type ReaderTopBarProps = {
  bookId: string;
};

export function ReaderTopBar({ bookId }: ReaderTopBarProps) {
  const { toMap } = useNavigation();

  return (
    <PageHeader
      title="阅读中"
      right={
        <button
          type="button"
          onClick={() => toMap(bookId)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-accent transition-colors hover:bg-muted"
          aria-label="打开阅读地图"
        >
          <Map className="size-[1.35rem]" strokeWidth={1.75} />
        </button>
      }
    />
  );
}
