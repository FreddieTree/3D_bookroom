import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type BookReadingProgress = {
  chapterIndex: number;
  paragraphId: string | null;
  scrollOffset: number;
};

export type ReaderStoreState = {
  /** Last focused book id (covers, shelf taps, entering reader). */
  activeBookId: string | null;
  progressByBook: Record<string, BookReadingProgress>;
  /** Optional flag: scroll into view on next ReaderShell mount when returning from routes. */
  restoreScrollPendingByBook: Record<string, boolean>;

  setActiveBookId: (bookId: string | null) => void;
  setReadingPosition: (
    bookId: string,
    patch: Partial<Omit<BookReadingProgress, never>>,
  ) => void;
  setScrollOffset: (bookId: string, scrollOffset: number) => void;
  requestRestoreScroll: (bookId: string, pending?: boolean) => void;
  /** Resolved snapshot after merge with defaults */
  restoreReadingPosition: (bookId: string) => BookReadingProgress;

  /** One-way import from deprecated appStore snapshot during migration */
  migrateFromLegacyBundle: (
    legacy: Partial<{
      readerProgressByBook: Record<
        string,
        { chapterIndex: number; paragraphId: string | null }
      >;
      currentBookId: string | null;
    }>,
  ) => void;
};

const emptyMem: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const defaultProgress = (): BookReadingProgress => ({
  chapterIndex: 0,
  paragraphId: null,
  scrollOffset: 0,
});

export const useReaderStore = create<ReaderStoreState>()(
  persist(
    (set, get) => ({
      activeBookId: null,
      progressByBook: {},
      restoreScrollPendingByBook: {},

      setActiveBookId: (activeBookId) => set({ activeBookId }),

      setReadingPosition: (bookId, patch) =>
        set((s) => {
          const prev = s.progressByBook[bookId] ?? defaultProgress();
          return {
            progressByBook: {
              ...s.progressByBook,
              [bookId]: { ...prev, ...patch },
            },
            restoreScrollPendingByBook: {
              ...s.restoreScrollPendingByBook,
              [bookId]: true,
            },
          };
        }),

      setScrollOffset: (bookId, scrollOffset) =>
        set((s) => {
          const prev = s.progressByBook[bookId] ?? defaultProgress();
          return {
            progressByBook: {
              ...s.progressByBook,
              [bookId]: { ...prev, scrollOffset },
            },
          };
        }),

      requestRestoreScroll: (bookId, pending = true) =>
        set((s) => ({
          restoreScrollPendingByBook: {
            ...s.restoreScrollPendingByBook,
            [bookId]: pending,
          },
        })),

      restoreReadingPosition: (bookId) => {
        return get().progressByBook[bookId] ?? defaultProgress();
      },

      migrateFromLegacyBundle: (legacy) => {
        const hasNew = Object.keys(get().progressByBook).length > 0;
        if (hasNew || !legacy.readerProgressByBook) return;
        const next: Record<string, BookReadingProgress> = {};
        for (const [id, row] of Object.entries(legacy.readerProgressByBook)) {
          next[id] = {
            chapterIndex: row.chapterIndex,
            paragraphId: row.paragraphId,
            scrollOffset: 0,
          };
        }
        const keys = Object.keys(next);
        const firstKey = keys[0] ?? null;
        set({
          progressByBook: next,
          activeBookId: legacy.currentBookId ?? firstKey,
        });
      },
    }),
    {
      name: "sanweishuwu-reader",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : emptyMem,
      ),
      partialize: (s) => ({
        activeBookId: s.activeBookId,
        progressByBook: s.progressByBook,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ReaderStoreState> | undefined;
        return {
          ...current,
          ...p,
          progressByBook: {
            ...current.progressByBook,
            ...p?.progressByBook,
          },
          restoreScrollPendingByBook: {},
        };
      },
    },
  ),
);
