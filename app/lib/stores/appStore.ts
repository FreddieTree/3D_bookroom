import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type AppStoreState = {
  currentBookId: string | null;
  currentChapterIndex: number;
  currentParagraphId: string | null;
  setCurrentBookId: (id: string | null) => void;
  setCurrentChapterIndex: (index: number) => void;
  setCurrentParagraphId: (id: string | null) => void;
  resetReaderPosition: () => void;
};

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useAppStore = create<AppStoreState>()(
  persist(
    (set) => ({
      currentBookId: null,
      currentChapterIndex: 0,
      currentParagraphId: null,
      setCurrentBookId: (currentBookId) => set({ currentBookId }),
      setCurrentChapterIndex: (currentChapterIndex) =>
        set({ currentChapterIndex }),
      setCurrentParagraphId: (currentParagraphId) =>
        set({ currentParagraphId }),
      resetReaderPosition: () =>
        set({ currentChapterIndex: 0, currentParagraphId: null }),
    }),
    {
      name: "sanweishuwu-app",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : memoryStorage,
      ),
      partialize: (state) => ({
        currentBookId: state.currentBookId,
        currentChapterIndex: state.currentChapterIndex,
        currentParagraphId: state.currentParagraphId,
      }),
    },
  ),
);
