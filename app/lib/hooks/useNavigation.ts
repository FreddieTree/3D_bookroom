"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Centralized client-side navigation for the app shell (no tab bar — per-page headers).
 */
export function useNavigation() {
  const router = useRouter();

  const back = useCallback(() => {
    router.back();
  }, [router]);

  const toBook = useCallback(
    (bookId: string) => {
      router.push(`/book/${bookId}`);
    },
    [router],
  );

  const toRead = useCallback(
    (bookId: string) => {
      router.push(`/book/${bookId}/read`);
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

  return {
    back,
    toBook,
    toRead,
    toMap,
    toFinished,
    toSettings,
    toLibrary,
  };
}
