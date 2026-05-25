"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  ChevronLeft,
  Gift,
  Lock,
  Mic,
  SendHorizontal,
  Trash2,
} from "lucide-react";

import { VoiceRecorderOverlay } from "@/app/components/chat/VoiceRecorderOverlay";
import { SideModal } from "@/app/components/ui/SideModal";
import { spring } from "@/app/lib/animations";
import { useOverlayHistoryBinding } from "@/app/lib/hooks/useOverlayHistory";
import { getSeedChatHistoryForBook } from "@/app/lib/mock/chat-seed";
import { MOCK_SUSPENSE_RELEASE_PREFIX } from "@/app/lib/mock/reading";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";
import type { ChatMessage } from "@/app/lib/mock/chat";
import { useAppStore } from "@/app/lib/stores/appStore";

const FIVE_MIN = 5 * 60 * 1000;

type ChatDrawerProps = {
  bookTitle: string;
  bookId: string;
  paragraphId: string | null;
  chapterIndex: number;
};

function formatTimeDivider(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ChatDrawer({
  bookTitle,
  bookId,
  paragraphId,
  chapterIndex,
}: ChatDrawerProps) {
  const open = useAppStore((s) => s.isChatOpen);
  const closeChat = useAppStore((s) => s.closeChat);
  const messages = useAppStore((s) => s.chatMessages);
  const clearChat = useAppStore((s) => s.clearChat);
  const isAiTyping = useAppStore((s) => s.isAiTyping);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);

  useOverlayHistoryBinding(open, closeChat, "app.chat");

  const [draft, setDraft] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const micPressTimer = useRef<number | null>(null);

  const flatMessages = useMemo(() => {
    if (messages.length > 0) return messages;
    return getSeedChatHistoryForBook(bookId);
  }, [messages, bookId]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [open, flatMessages, isAiTyping]);

  const startMicHold = () => {
    clearMicHold();
    micPressTimer.current = window.setTimeout(() => {
      micPressTimer.current = null;
      safeVibrate(12);
      setVoiceOpen(true);
    }, 200);
  };

  const clearMicHold = () => {
    if (micPressTimer.current) {
      window.clearTimeout(micPressTimer.current);
      micPressTimer.current = null;
    }
  };

  const handleSend = () => {
    const t = draft.trim();
    if (!t) return;
    sendChatMessage(t, {
      bookId,
      paragraphId,
      currentChapterIndex: chapterIndex,
    });
    setDraft("");
  };

  const rows = flatMessages.flatMap((m, i): React.ReactNode[] => {
    const prev = flatMessages[i - 1];
    const out: React.ReactNode[] = [];
    if (!prev || m.createdAt - prev.createdAt > FIVE_MIN) {
      out.push(
        <li key={`d-${m.id}`} className="list-none px-8 py-5 text-center">
          <span className="rounded-full bg-muted px-4 py-1.5 font-sans text-[0.6875rem] font-medium text-muted-foreground">
            {formatTimeDivider(m.createdAt)}
          </span>
        </li>,
      );
    }
    out.push(<MessageRow key={m.id} message={m} />);
    return out;
  });

  return (
    <>
      <SideModal
        customHeader
        nestedLayout
        open={open}
        onClose={closeChat}
        side="right"
        transition={spring.soft}
        panelClassName="max-h-[100dvh] w-[min(100vw,_26rem)] border-l border-border shadow-[var(--shadow-elevation-3)]"
      >
        <div className="flex min-h-0 flex-1 select-none flex-col">
          <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={() => {
                safeVibrate(6);
                closeChat();
              }}
              className="-ml-0.5 flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
              aria-label="关闭"
            >
              <ChevronLeft className="size-6" strokeWidth={1.65} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/35 text-accent-foreground shadow-[var(--shadow-elevation-1)] ring-2 ring-accent/55">
                <Bot className="size-[1.2rem]" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="line-clamp-1 font-sans text-sm font-semibold text-foreground">
                  和 AI 聊《{bookTitle}》
                </p>
                <p className="line-clamp-1 font-sans text-[0.6875rem] font-medium tracking-tight text-muted-foreground">
                  第 {chapterIndex + 1} 章
                  {paragraphId
                    ? ` · 段落 ${paragraphId.slice(0, 10)}${paragraphId.length > 10 ? "…" : ""}`
                    : " · 未锁定段落"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
              aria-label="清空对话（占位）"
              onClick={() => {
                safeVibrate(5);
                clearChat();
              }}
            >
              <Trash2 className="size-[1.15rem]" strokeWidth={2} />
            </button>
          </header>

          <div
            ref={listRef}
            className="min-h-0 flex-1 list-none overflow-y-auto overscroll-contain px-3 pb-3 pt-1"
          >
            <ul role="list" className="space-y-3">
              {flatMessages.length === 0 && !isAiTyping ? (
                <li className="list-none px-6 py-16 text-center">
                  <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                    还没有消息。就着当前段落问一个问题，或使用语音输入。
                  </p>
                  <p className="font-sans mt-3 text-xs text-muted-foreground/80">
                    对话会先出现在此设备本地；在线时会同步写入服务器会话库（需已配置 MongoDB）。
                  </p>
                </li>
              ) : (
                rows
              )}
              {isAiTyping ? <TypingRow /> : null}
            </ul>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-background/95 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
            <div className="flex items-end gap-2 px-3">
              <button
                type="button"
                className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                aria-label="长按语音输入"
                onPointerDown={startMicHold}
                onPointerUp={clearMicHold}
                onPointerCancel={clearMicHold}
              >
                <Mic className="size-[1.15rem]" strokeWidth={1.75} />
              </button>
              <textarea
                rows={1}
                value={draft}
                placeholder="写点什么…"
                onChange={(e) => setDraft(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  const max = 22 * 4;
                  el.style.height = `${Math.min(el.scrollHeight, max)}px`;
                }}
                className="mb-1 min-h-[2.5rem] max-h-24 flex-1 resize-none select-text rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={handleSend}
                className={cn(
                  "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                  draft.trim()
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "bg-muted text-muted-foreground",
                )}
                aria-label="发送"
              >
                <SendHorizontal className="size-5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </SideModal>

      <VoiceRecorderOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSend={(text) => {
          sendChatMessage(text, {
            bookId,
            paragraphId,
            currentChapterIndex: chapterIndex,
          });
        }}
      />
    </>
  );
}

function MessageRow({ message: m }: { message: ChatMessage }) {
  if (m.type === "pending-release") {
    return (
      <li className="list-none">
        <motion.div
          initial={{ opacity: 0, y: -26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring" as const,
            stiffness: 320,
            damping: 26,
          }}
          className="relative mx-auto max-w-[94%] overflow-hidden rounded-[1.125rem] border-2 border-amber-500/52 bg-gradient-to-br from-amber-200/45 via-muted/75 to-muted p-px shadow-[var(--shadow-elevation-2)] ring-8 ring-transparent dark:border-amber-400/52 dark:from-amber-950/50"
        >
          <div className="rounded-[1.0625rem] bg-[color-mix(in_oklch,var(--color-background)_94%,transparent)] px-4 py-3 text-[0.9375rem] leading-relaxed text-foreground backdrop-blur-sm">
            <p className="flex items-start gap-2 font-medium">
              <Gift className="mt-1 size-[1rem] shrink-0 text-primary" strokeWidth={1.95} />
              <span className="block">
                <span className="text-primary">{MOCK_SUSPENSE_RELEASE_PREFIX}</span>
                {m.content}
              </span>
            </p>
          </div>
        </motion.div>
      </li>
    );
  }

  if (m.role === "user") {
    return (
      <li className="list-none">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-primary-foreground">
            {m.content}
          </div>
        </motion.div>
      </li>
    );
  }

  if (m.type === "spoiler-blocked") {
    return (
      <li className="list-none">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="relative flex max-w-[92%] gap-2.5 rounded-2xl border-2 border-amber-600/62 bg-transparent px-3.5 py-3 shadow-[var(--shadow-elevation-2)] backdrop-blur-sm dark:border-amber-500/72">
            <Lock className="mt-1 size-[1.05rem] shrink-0 text-primary" strokeWidth={2} />
            <span className="text-[0.9rem] font-medium leading-relaxed">{m.content}</span>
          </div>
        </motion.div>
      </li>
    );
  }

  return (
    <li className="list-none">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start gap-2"
      >
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Bot className="size-4" strokeWidth={2} />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[color-mix(in_oklch,var(--color-muted)_92%,var(--color-background))] px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-foreground">
          {m.content}
          {m.conceptId ? (
            <p className="mt-2 border-t border-border/50 pt-2 font-sans text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              关联概念 · {m.conceptId.replace(/-/g, " ")}
            </p>
          ) : null}
          {m.citations && m.citations.length > 0 ? (
            <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
              <p className="font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                正文摘录
              </p>
              {m.citations.slice(0, 3).map((c, i) => (
                <p
                  key={`${c.paragraphId}-${String(i)}`}
                  className="font-serif text-[0.78rem] leading-snug text-muted-foreground"
                >
                  <span className="font-mono-nums opacity-85">
                    {c.paragraphId}
                  </span>
                  ：{c.snippet}
                </p>
              ))}
            </div>
          ) : null}
          {m.isStreaming ? (
            <span className="ml-0.5 inline-block w-2 animate-pulse">▍</span>
          ) : null}
        </div>
      </motion.div>
    </li>
  );
}

function TypingRow() {
  return (
    <li className="list-none flex justify-start gap-2 pl-1 pt-3">
      <div className="mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="size-4 text-muted-foreground" strokeWidth={2} />
      </div>
      <div className="flex items-center gap-1 rounded-3xl bg-muted px-6 py-[0.8rem]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block size-2.5 rounded-full bg-muted-foreground/75"
            animate={{ y: [0, -6.5, 0], opacity: [0.4, 1, 0.43] }}
            transition={{
              duration: 0.58,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.12,
            }}
          />
        ))}
      </div>
    </li>
  );
}
