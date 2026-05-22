"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { withViewTransition } from "@/app/lib/startViewTransition";

/** Match `/book/:bookId[/read|map|finished|chapter/:n/cover]` */
export function parseBookPath(pathname: string): {
  bookId: string;
  tail:
    | "cover"
    | "read"
    | "map"
    | "finished"
    | { kind: "chapter-cover"; chapterIndex: number };
} | null {
  const mChapter = pathname.match(/^\/book\/([^/]+)\/chapter\/(\d+)\/cover$/);
  if (mChapter) {
    return {
      bookId: mChapter[1],
      tail: {
        kind: "chapter-cover",
        chapterIndex: Number.parseInt(mChapter[2], 10),
      },
    };
  }
  const m = pathname.match(/^\/book\/([^/]+)(?:\/(read|map|finished))?$/);
  if (!m) return null;
  const bookId = m[1];
  const leaf = m[2];
  if (!leaf) return { bookId, tail: "cover" };
  return { bookId, tail: leaf as "read" | "map" | "finished" };
}

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const vtPush = useCallback(
    (href: string, scroll = true) => {
      withViewTransition(() => {
        router.push(href, { scroll });
      });
    },
    [router],
  );

  const toHome = useCallback(() => {
    vtPush("/", true);
  }, [vtPush]);

  const toBook = useCallback(
    (bookId: string) => {
      vtPush(`/book/${bookId}`, true);
    },
    [vtPush],
  );

  const toRead = useCallback(
    (
      bookId: string,
      opts?: {
        replace?: boolean;
        /** 正文序列中的零基索引（与其它 body、API chapters 对齐） */
        chapter?: number | null;
        /** 段落 id；阅读器优先用 ?p= 定位章节与滚动位置 */
        p?: string | null;
        fromCover?: boolean;
      },
    ) => {
      const params = new URLSearchParams();
      if (
        opts?.chapter != null &&
        Number.isFinite(opts.chapter) &&
        opts.chapter >= 0
      ) {
        params.set("chapter", String(Math.floor(opts.chapter)));
      }
      const para = opts?.p?.trim();
      if (para) params.set("p", para);
      if (opts?.fromCover) params.set("fromCover", "1");
      const q = params.toString() ? `?${params}` : "";

      const href = `/book/${bookId}/read${q}`;
      if (opts?.replace) {
        router.replace(href, { scroll: false });
        return;
      }
      vtPush(href, false);
    },
    [router, vtPush],
  );

  const toMap = useCallback(
    (bookId: string) => {
      vtPush(`/book/${bookId}/map`, false);
    },
    [vtPush],
  );

  const toFinished = useCallback(
    (bookId: string, opts?: { celebrate?: boolean }) => {
      const q = opts?.celebrate ? "?celebrate=1" : "";
      vtPush(`/book/${bookId}/finished${q}`, false);
    },
    [vtPush],
  );

  const toSettings = useCallback(() => {
    vtPush("/settings", true);
  }, [vtPush]);

  const toLibrary = useCallback(() => {
    vtPush("/library", true);
  }, [vtPush]);

  const back = useCallback(() => {
    const book = parseBookPath(pathname);
    if (!book) {
      if (pathname === "/" || pathname === "") {
        if (typeof window !== "undefined") window.history.back();
        return;
      }
      router.back();
      return;
    }

    if (typeof book.tail === "object" && book.tail.kind === "chapter-cover") {
      router.replace(
        `/book/${book.bookId}/read?chapter=${String(book.tail.chapterIndex)}`,
        { scroll: false },
      );
      return;
    }

    switch (book.tail) {
      case "read":
        vtPush(`/book/${book.bookId}`, false);
        return;
      case "map":
        router.replace(`/book/${book.bookId}/read`, { scroll: false });
        return;
      case "finished":
        router.replace(`/book/${book.bookId}/read`, { scroll: false });
        return;
      default:
        vtPush("/", true);
    }
  }, [pathname, router, vtPush]);

  return {
    back,
    toHome,
    toBook,
    toRead,
    toMap,
    toFinished,
    toSettings,
    toLibrary,
  };
}
