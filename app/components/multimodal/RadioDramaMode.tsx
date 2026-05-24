"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, X } from "lucide-react";

import type { Paragraph } from "@/app/lib/data/sample-content";
import { cn } from "@/app/lib/utils";

type RadioRole = { id: string; label: string; emoji: string; voiceId: string };

const NARRATOR_VOICE = "Chinese (Mandarin)_Gentleman";

const DEFAULT_ROLES: RadioRole[] = [
  { id: "narrator", label: "叙述者", emoji: "🎧", voiceId: NARRATOR_VOICE },
  { id: "prince", label: "小王子", emoji: "🤴", voiceId: "Chinese (Mandarin)_Cute_Spirit" },
  { id: "rose", label: "玫瑰", emoji: "🌹", voiceId: "Chinese (Mandarin)_Mature_Woman" },
];

type DialogueLine = { text: string; roleIndex: number };

function extractDialogues(text: string): DialogueLine[] {
  // 匹配中文引号 "..." 内的对白，最多 3 句
  const re = /[""""]([^""""]{2,80})["""]/g;
  const results: DialogueLine[] = [];
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text)) !== null && results.length < 3) {
    results.push({ text: m[1]!, roleIndex: (idx % 2) + 1 });
    idx++;
  }
  return results;
}

async function fetchVoiceCast(bookId: string): Promise<Record<string, { voice_id: string }>> {
  try {
    const res = await fetch(`/books/${bookId}/voice_cast.json`);
    if (!res.ok) return {};
    return (await res.json()) as Record<string, { voice_id: string }>;
  } catch {
    return {};
  }
}

async function synthesize(text: string, voiceId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/generate-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

type RadioDramaModeProps = {
  bookId: string;
  open: boolean;
  onClose: () => void;
  paragraph: Paragraph | null;
};

export function RadioDramaMode({ bookId, open, onClose, paragraph }: RadioDramaModeProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [roles, setRoles] = useState<RadioRole[]>(DEFAULT_ROLES);

  // 用 ref 存当前的 lines/roles，避免 stale closure
  const linesRef = useRef<DialogueLine[]>([]);
  const rolesRef = useRef<RadioRole[]>(DEFAULT_ROLES);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  // 同步 roles state 到 ref
  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopAll();
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
      queueMicrotask(() => {
        setPlaying(false);
        setLoading(false);
        setActiveLine(0);
      });
    }
  }, [open, stopAll]);

  useEffect(() => () => { stopAll(); }, [stopAll]);

  // 段落变化时解析对白，并加载 voice cast
  useEffect(() => {
    if (!paragraph) return;
    const extracted = extractDialogues(paragraph.text);
    if (extracted.length === 0) {
      linesRef.current = [{ text: paragraph.text.slice(0, 200), roleIndex: 0 }];
    } else {
      linesRef.current = extracted;
    }

    void fetchVoiceCast(bookId).then((cast) => {
      if (Object.keys(cast).length === 0) return;
      const next = [...DEFAULT_ROLES];
      const narratorVoice = cast["叙述者/飞行员"]?.voice_id ?? NARRATOR_VOICE;
      next[0] = { ...next[0]!, voiceId: narratorVoice };
      const princeVoice = cast["小王子"]?.voice_id ?? next[1]!.voiceId;
      next[1] = { ...next[1]!, voiceId: princeVoice };
      const roseVoice = cast["玫瑰"]?.voice_id ?? next[2]!.voiceId;
      next[2] = { ...next[2]!, voiceId: roseVoice };
      rolesRef.current = next;
      setRoles(next);
    });
  }, [paragraph, bookId]);

  // 顺序播放每一句，通过 ref 避免 stale closure
  const playFrom = useCallback(async (idx: number) => {
    async function run(i: number): Promise<void> {
      const allLines = linesRef.current;
      const allRoles = rolesRef.current;

      if (!playingRef.current || i >= allLines.length) {
        setPlaying(false);
        setActiveLine(0);
        return;
      }

      const dl = allLines[i]!;
      const role = allRoles[dl.roleIndex] ?? allRoles[0]!;
      setActiveLine(dl.roleIndex);

      const blobUrl = await synthesize(dl.text, role.voiceId);
      if (!blobUrl || !playingRef.current) {
        await run(i + 1);
        return;
      }

      blobUrlsRef.current.push(blobUrl);
      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      audio.onended = () => {
        void run(i + 1);
      };
      try {
        await audio.play();
      } catch {
        await run(i + 1);
      }
    }

    await run(idx);
  }, []);

  const togglePlay = async () => {
    if (!open) return;
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }
    setLoading(true);
    playingRef.current = true;
    setPlaying(true);
    setActiveLine(0);
    setLoading(false);
    void playFrom(0);
  };

  return (
    <AnimatePresence>
      {open && paragraph ? (
        <>
          <motion.div
            className="fixed inset-0 z-[150] bg-black/72 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="font-sans fixed inset-x-0 bottom-0 z-[160] mx-auto w-full max-w-[430px] rounded-t-2xl border border-white/10 bg-[#0e0e12]/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-zinc-100 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.65)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">广播剧 · 体验</p>
              <button
                type="button"
                onClick={() => {
                  stopAll();
                  setPlaying(false);
                  onClose();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="退出"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>

            <p className="mb-4 line-clamp-4 text-[0.85rem] leading-relaxed text-zinc-300">
              {paragraph.text}
            </p>

            <div className="mb-4 flex justify-between gap-2 px-1">
              {roles.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex flex-1 flex-col items-center rounded-xl px-1 py-2 transition-all",
                    playing && activeLine === i
                      ? "scale-105 bg-white/12 ring-1 ring-amber-400/50"
                      : "bg-white/[0.04] opacity-70",
                  )}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="mt-1 text-[0.65rem] text-zinc-400">{r.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => void togglePlay()}
                disabled={loading}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md disabled:opacity-60"
                aria-label={playing ? "暂停" : "播放"}
              >
                {playing ? (
                  <Pause className="size-5" fill="currentColor" />
                ) : (
                  <Play className="size-5" fill="currentColor" />
                )}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
