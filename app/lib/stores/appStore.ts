import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import {
  mockChatResponse,
  mockReleaseAnswer,
  shouldDeferAsSpoiler,
  spoilerQueueCopy,
  type ChatMessage,
  type PendingQuestion,
} from "@/app/lib/mock/chat";
import type { MapFilterTab } from "@/app/lib/mock/map-data";
import {
  DEFAULT_MOCK_TOKEN,
  DEFAULT_MOCK_USER,
  type MockTokenUsage,
  type MockUserProfile,
} from "@/app/lib/mock/account-mock";

export type ReaderThemeMode = "light" | "dark" | "system";

export type ReadingDisplayMode = "standard" | "immersive";

export type ReaderSettings = {
  fontSize: 14 | 16 | 18 | 20 | 22;
  brightness: number;
  theme: ReaderThemeMode;
  bgmEnabled: boolean;
  voiceProfile: string;
  /** 沉浸朗读：大号字 + 自动锚点推进 */
  readingDisplayMode: ReadingDisplayMode;
  /** 朗读倍速（相对基准 1） */
  readSpeed: number;
};

export type BookReaderProgress = {
  chapterIndex: number;
  paragraphId: string | null;
};

export type ParagraphVisual = {
  id: string;
  emoji: string;
  colorFrom: string;
  colorTo: string;
  createdAt: number;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  brightness: 1,
  theme: "system",
  bgmEnabled: false,
  voiceProfile: "ceramic",
  readingDisplayMode: "standard",
  readSpeed: 1,
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type AppStoreState = {
  currentBookId: string | null;
  currentChapterIndex: number;
  currentParagraphId: string | null;
  readerSettings: ReaderSettings;
  readerProgressByBook: Record<string, BookReaderProgress>;

  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  chatDrawerHeightPct: number;
  pendingQuestions: PendingQuestion[];
  isAiTyping: boolean;

  /** 阅读地图：筛选与滚动位置（按书） */
  mapSessionByBook: Record<
    string,
    { filterTab: MapFilterTab; scrollTop: number }
  >;
  setMapSession: (
    bookId: string,
    patch: Partial<{ filterTab: MapFilterTab; scrollTop: number }>,
  ) => void;

  setCurrentBookId: (id: string | null) => void;
  setCurrentChapterIndex: (index: number) => void;
  setCurrentParagraphId: (id: string | null) => void;
  setReaderSettings: (patch: Partial<ReaderSettings>) => void;
  setReadingAnchor: (
    bookId: string,
    chapterIndex: number,
    paragraphId: string | null,
  ) => void;
  resetReaderPosition: () => void;

  openChat: () => void;
  closeChat: () => void;
  setChatDrawerHeightPct: (pct: number) => void;
  sendChatMessage: (
    text: string,
    ctx: { bookId: string; paragraphId: string | null; currentChapterIndex: number },
  ) => void;
  /** 释放队首悬念（红点 / 显式调用） */
  releasePending: () => void;
  /** 清空对话（可选，调试用） */
  clearChat: () => void;

  /** 段落配图（Mock placeholder），按书 / 段落 id */
  paragraphVisualsByBook: Record<string, Record<string, ParagraphVisual[]>>;
  addParagraphVisual: (
    bookId: string,
    paragraphId: string,
    draft: Pick<ParagraphVisual, "emoji" | "colorFrom" | "colorTo">,
  ) => void;
  removeParagraphVisual: (
    bookId: string,
    paragraphId: string,
    visualId: string,
  ) => void;

  /** 阅读器 BGM 小条是否折叠 */
  readerBgmBarCollapsed: boolean;
  setReaderBgmBarCollapsed: (collapsed: boolean) => void;

  /** 通知总开关（Mock） */
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;

  /** 演示用户与用量（商业模式验证） */
  mockUser: MockUserProfile;
  mockTokenUsage: MockTokenUsage;
  setMockUser: (patch: Partial<MockUserProfile>) => void;
  /** Mock 退出登录提示 */
  mockSignOut: () => void;
};

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const CHAT_HEIGHT_DEFAULT = 60;
const REVEAL_CHAPTER = 3;

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      currentBookId: null,
      currentChapterIndex: 0,
      currentParagraphId: null,
      readerSettings: { ...DEFAULT_READER_SETTINGS },
      readerProgressByBook: {},

      chatMessages: [],
      isChatOpen: false,
      chatDrawerHeightPct: CHAT_HEIGHT_DEFAULT,
      pendingQuestions: [],
      isAiTyping: false,

      mapSessionByBook: {},

      paragraphVisualsByBook: {},
      readerBgmBarCollapsed: false,

      notificationsEnabled: true,
      mockUser: { ...DEFAULT_MOCK_USER },
      mockTokenUsage: { ...DEFAULT_MOCK_TOKEN },

      setCurrentBookId: (currentBookId) => set({ currentBookId }),
      setCurrentChapterIndex: (currentChapterIndex) =>
        set({ currentChapterIndex }),
      setCurrentParagraphId: (currentParagraphId) =>
        set({ currentParagraphId }),

      setReaderSettings: (patch) =>
        set((s) => ({
          readerSettings: { ...s.readerSettings, ...patch },
        })),

      setReadingAnchor: (bookId, chapterIndex, paragraphId) =>
        set((s) => ({
          currentChapterIndex: chapterIndex,
          currentParagraphId: paragraphId,
          readerProgressByBook: {
            ...s.readerProgressByBook,
            [bookId]: { chapterIndex, paragraphId },
          },
        })),

      resetReaderPosition: () =>
        set({ currentChapterIndex: 0, currentParagraphId: null }),

      openChat: () => set({ isChatOpen: true }),

      closeChat: () =>
        set({ isChatOpen: false, chatDrawerHeightPct: CHAT_HEIGHT_DEFAULT }),

      setChatDrawerHeightPct: (pct) =>
        set({ chatDrawerHeightPct: Math.min(90, Math.max(35, pct)) }),

      clearChat: () =>
        set({ chatMessages: [], pendingQuestions: [], isAiTyping: false }),

      setMapSession: (bookId, patch) =>
        set((s) => {
          const prev = s.mapSessionByBook[bookId] ?? {
            filterTab: "all" as MapFilterTab,
            scrollTop: 0,
          };
          return {
            mapSessionByBook: {
              ...s.mapSessionByBook,
              [bookId]: { ...prev, ...patch },
            },
          };
        }),

      addParagraphVisual: (bookId, paragraphId, draft) =>
        set((s) => {
          const byBook = s.paragraphVisualsByBook[bookId] ?? {};
          const list = byBook[paragraphId] ?? [];
          const next: ParagraphVisual = {
            id: uid(),
            ...draft,
            createdAt: Date.now(),
          };
          return {
            paragraphVisualsByBook: {
              ...s.paragraphVisualsByBook,
              [bookId]: {
                ...byBook,
                [paragraphId]: [...list, next],
              },
            },
          };
        }),

      removeParagraphVisual: (bookId, paragraphId, visualId) =>
        set((s) => {
          const byBook = s.paragraphVisualsByBook[bookId] ?? {};
          const list = byBook[paragraphId] ?? [];
          return {
            paragraphVisualsByBook: {
              ...s.paragraphVisualsByBook,
              [bookId]: {
                ...byBook,
                [paragraphId]: list.filter((v) => v.id !== visualId),
              },
            },
          };
        }),

      setReaderBgmBarCollapsed: (readerBgmBarCollapsed) =>
        set({ readerBgmBarCollapsed }),

      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),

      setMockUser: (patch) =>
        set((s) => ({
          mockUser: { ...s.mockUser, ...patch },
        })),

      mockSignOut: () => {
        if (typeof window !== "undefined") {
          window.alert("演示版：已结束本会话（数据仍保留在本地）。");
        }
      },

      releasePending: () => {
        const pending = get().pendingQuestions[0];
        if (!pending) {
          set({ isChatOpen: true });
          return;
        }
        const msg: ChatMessage = {
          id: uid(),
          role: "ai",
          type: "pending-release",
          content: mockReleaseAnswer(pending),
          createdAt: Date.now(),
        };
        set((s) => ({
          pendingQuestions: s.pendingQuestions.slice(1),
          chatMessages: [...s.chatMessages, msg],
          isChatOpen: true,
        }));
      },

      sendChatMessage: (text, ctx) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = {
          id: uid(),
          role: "user",
          type: "normal",
          content: trimmed,
          createdAt: Date.now(),
        };

        set((s) => ({
          chatMessages: [...s.chatMessages, userMsg],
          isAiTyping: true,
        }));

        void (async () => {
          try {
            if (shouldDeferAsSpoiler(trimmed)) {
              const pendingId = uid();
              const pending: PendingQuestion = {
                id: pendingId,
                userQuestion: trimmed,
                paragraphId: ctx.paragraphId,
                revealAfterChapter: REVEAL_CHAPTER,
              };
              const aiMsg: ChatMessage = {
                id: uid(),
                role: "ai",
                type: "spoiler-blocked",
                content: spoilerQueueCopy(REVEAL_CHAPTER),
                pendingId,
                createdAt: Date.now(),
              };
              set((s) => ({
                isAiTyping: false,
                pendingQuestions: [...s.pendingQuestions, pending],
                chatMessages: [...s.chatMessages, aiMsg],
              }));
              return;
            }

            const aiId = uid();
            set((s) => ({
              chatMessages: [
                ...s.chatMessages,
                {
                  id: aiId,
                  role: "ai",
                  type: "normal",
                  content: "",
                  createdAt: Date.now(),
                  isStreaming: true,
                },
              ],
            }));

            let firstChunk = true;
            try {
              await mockChatResponse(trimmed, ctx.paragraphId, (partial) => {
                set((s) => ({
                  isAiTyping: firstChunk ? false : s.isAiTyping,
                  chatMessages: s.chatMessages.map((m) =>
                    m.id === aiId
                      ? { ...m, content: partial, isStreaming: true }
                      : m,
                  ),
                }));
                firstChunk = false;
              });
            } catch {
              set((s) => ({
                chatMessages: s.chatMessages.map((m) =>
                  m.id === aiId
                    ? {
                        ...m,
                        content: "回复暂时不可用，请检查网络后重试。",
                        isStreaming: false,
                      }
                    : m,
                ),
                isAiTyping: false,
              }));
              return;
            }

            set((s) => ({
              chatMessages: s.chatMessages.map((m) =>
                m.id === aiId ? { ...m, isStreaming: false } : m,
              ),
              isAiTyping: false,
            }));
          } catch {
            set({ isAiTyping: false });
          }
        })();
      },
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
        readerSettings: state.readerSettings,
        readerProgressByBook: state.readerProgressByBook,
        chatMessages: state.chatMessages,
        pendingQuestions: state.pendingQuestions,
        mapSessionByBook: state.mapSessionByBook,
        paragraphVisualsByBook: state.paragraphVisualsByBook,
        readerBgmBarCollapsed: state.readerBgmBarCollapsed,
        notificationsEnabled: state.notificationsEnabled,
        mockUser: state.mockUser,
        mockTokenUsage: state.mockTokenUsage,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppStoreState> | undefined;
        return {
          ...current,
          ...p,
          readerSettings: {
            ...DEFAULT_READER_SETTINGS,
            ...current.readerSettings,
            ...p?.readerSettings,
          },
          readerProgressByBook: {
            ...current.readerProgressByBook,
            ...p?.readerProgressByBook,
          },
          chatMessages: p?.chatMessages ?? current.chatMessages,
          pendingQuestions:
            p?.pendingQuestions ?? current.pendingQuestions,
          mapSessionByBook: {
            ...current.mapSessionByBook,
            ...p?.mapSessionByBook,
          },
          paragraphVisualsByBook: {
            ...current.paragraphVisualsByBook,
            ...p?.paragraphVisualsByBook,
          },
          readerBgmBarCollapsed:
            p?.readerBgmBarCollapsed ?? current.readerBgmBarCollapsed,
          notificationsEnabled:
            p?.notificationsEnabled ?? current.notificationsEnabled,
          mockUser: {
            ...DEFAULT_MOCK_USER,
            ...(current.mockUser ?? {}),
            ...(p?.mockUser ?? {}),
          },
          mockTokenUsage: {
            ...DEFAULT_MOCK_TOKEN,
            ...(current.mockTokenUsage ?? {}),
            ...(p?.mockTokenUsage ?? {}),
          },
          isChatOpen: false,
          isAiTyping: false,
        };
      },
    },
  ),
);

export type { ChatMessage, PendingQuestion, MockUserProfile, MockTokenUsage };
