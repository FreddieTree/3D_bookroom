"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Bot, Lock, Mic, SendHorizontal, Sparkles, X } from "lucide-react";

import { VoiceRecorderOverlay } from "@/app/components/chat/VoiceRecorderOverlay";
import { cn } from "@/app/lib/utils";
import { safeVibrate } from "@/app/lib/utils/vibrate";
import type { ChatMessage } from "@/app/lib/mock/chat";
import { useAppStore } from "@/app/lib/stores/appStore";

type ChatDrawerProps = {
  bookTitle: string;
  bookId: string;
  paragraphId: string | null;
  chapterIndex: number;
};

export function ChatDrawer({
  bookTitle,
  bookId,
  paragraphId,
  chapterIndex,
}: ChatDrawerProps) {
  const open = useAppStore((s) => s.isChatOpen);
  const closeChat = useAppStore((s) => s.closeChat);
  const messages = useAppStore((s) => s.chatMessages);
  const isAiTyping = useAppStore((s) => s.isAiTyping);
  const heightPct = useAppStore((s) => s.chatDrawerHeightPct);
  const setChatDrawerHeightPct = useAppStore((s) => s.setChatDrawerHeightPct);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);

  const [draft, setDraft] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const micPressTimer = useRef<number | null>(null);

  const dragControls = useDragControls();

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [open, messages, isAiTyping]);

  const startMicHold = () => {
    clearMicHold();
    micPressTimer.current = window.setTimeout(() => {
      micPressTimer.current = null;
      safeVibrate(12);
      setVoiceOpen(true);
    }, 450);
  };

  const clearMicHold = () => {
    if (micPressTimer.current) {
      clearTimeout(micPressTimer.current);
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

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭对话遮罩"
              className="fixed inset-0 z-[85] bg-black/28"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeChat()}
            />
            <motion.div
              className="font-sans fixed left-1/2 z-[90] flex w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-[var(--shadow-soft)]"
              style={{
                height: `min(${heightPct}dvh, 90dvh)`,
                bottom: 0,
                willChange: "transform, height",
              }}
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              exit={{ y: "105%" }}
              transition={{
                type: "spring" as const,
                stiffness: 420,
                damping: 34,
              }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 280 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 560) {
                  closeChat();
                  return;
                }
                const next =
                  heightPct - info.offset.y / (window.innerHeight / 100);
                setChatDrawerHeightPct(next);
              }}
            >
              <div className="flex cursor-grab touch-none flex-col items-center border-b border-border/60 py-2 active:cursor-grabbing">
                <button
                  type="button"
                  aria-label="拖动调整高度"
                  onPointerDown={(e) => dragControls.start(e)}
                  className="flex w-full flex-col items-center gap-1 rounded-lg py-1"
                >
                  <span className="h-1 w-10 rounded-full bg-border" />
                </button>
                <div className="flex w-full items-center justify-between px-3 pt-1">
                  <p className="flex items-center gap-1.5 pl-1 text-sm font-semibold text-foreground">
                    <Sparkles className="size-4 text-primary" strokeWidth={1.75} />
                    和 AI 聊聊 {bookTitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => closeChat()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label="关闭"
                  >
                    <X className="size-5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
              >
                {messages.length === 0 && !isAiTyping ? (
                  <p className="text-center text-sm text-muted-foreground">
                    和小王子、玫瑰或任何段落聊聊吧。
                  </p>
                ) : null}
                {messages.map((m) => (
                  <MessageRow key={m.id} message={m} />
                ))}
                {isAiTyping ? <TypingRow /> : null}
              </div>

              <div className="border-t border-border/80 bg-background/95 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
                <div className="flex items-end gap-2">
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
                    className="mb-1 min-h-[2.5rem] max-h-24 flex-1 resize-none rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
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
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

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
      <motion.div
        initial={{ opacity: 0, y: -28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring" as const,
          stiffness: 320,
          damping: 26,
        }}
        className="relative overflow-hidden rounded-2xl border-2 border-primary/45 bg-[color-mix(in_oklch,var(--color-primary)_12%,var(--color-background))] px-4 py-3 text-[0.9375rem] leading-relaxed text-foreground shadow-[0_0_28px_-8px_var(--color-primary)]"
      >
        <p className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          {m.content}
        </p>
      </motion.div>
    );
  }

  if (m.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-primary-foreground">
          {m.content}
        </div>
      </motion.div>
    );
  }

  if (m.type === "spoiler-blocked") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start"
      >
        <div className="flex max-w-[92%] gap-2 rounded-2xl border-2 border-amber-500/45 bg-amber-100/25 px-3.5 py-3 text-[0.9rem] leading-relaxed text-foreground dark:border-amber-400/35 dark:bg-amber-950/25">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
          <span>{m.content}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start gap-2"
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/25 text-accent">
        <Bot className="size-4" strokeWidth={1.75} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[color-mix(in_oklch,var(--color-muted)_92%,var(--color-background))] px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-foreground">
        {m.content}
        {m.isStreaming ? (
          <span className="ml-0.5 inline-block w-2 animate-pulse">▍</span>
        ) : null}
      </div>
    </motion.div>
  );
}

function TypingRow() {
  return (
    <div className="flex justify-start gap-2 pl-1">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="size-4 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-muted-foreground/75"
            animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
            transition={{
              duration: 0.55,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.14,
            }}
          />
        ))}
      </div>
    </div>
  );
}
