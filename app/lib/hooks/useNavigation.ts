"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

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

  const toHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const toBook = useCallback(
    (bookId: string) => {
      router.push(`/book/${bookId}`);
    },
    [router],
  );

  const toRead = useCallback(
    (bookId: string, opts?: { replace?: boolean }) => {
      const href = `/book/${bookId}/read`;
      if (opts?.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router],
  );

  const toMap = useCallback(
    (bookId: string) => {
      router.push(`/book/${bookId}/map`);
    },
    [router],
  );

  const toFinished = useCallback(
    (bookId: string) => {
      router.push(`/book/${bookId}/finished`);
    },
    [router],
  );

  const toSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const toLibrary = useCallback(() => {
    router.push("/library");
  }, [router]);

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
        router.push(`/book/${book.bookId}`);
        return;
      case "map":
        router.replace(`/book/${book.bookId}/read`, { scroll: false });
        return;
      case "finished":
        router.replace(`/book/${book.bookId}/read`, { scroll: false });
        return;
      default:
        router.push("/");
    }
  }, [pathname, router]);

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
