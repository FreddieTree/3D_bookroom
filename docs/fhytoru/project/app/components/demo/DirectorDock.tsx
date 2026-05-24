"use client";

import { useEffect, useState, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookMarked,
  Clapperboard,
  Map,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";

import {
  clearDirectorModeSession,
  isDirectorModeSession,
  IS_DEMO_MODE,
  persistDirectorModeFromSearch,
} from "@/app/lib/env/demo";
import { useAppStore } from "@/app/lib/stores/appStore";

const DEFAULT_BOOK = "little-prince";

export function DirectorDock() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);

  const currentBookId = useAppStore((s) => s.currentBookId);
  const openChat = useAppStore((s) => s.openChat);
  const releasePending = useAppStore((s) => s.releasePending);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    persistDirectorModeFromSearch(window.location.search);
    startTransition(() => {
      setActive(isDirectorModeSession());
    });
  }, [pathname]);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    const onPop = () => {
      persistDirectorModeFromSearch(window.location.search);
      startTransition(() => {
        setActive(isDirectorModeSession());
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!IS_DEMO_MODE || !active) return null;

  const bookId =
    currentBookId ??
    (pathname.match(/^\/book\/([^/]+)/)?.[1] ?? DEFAULT_BOOK);

  const onReadPage = pathname === `/book/${bookId}/read`;

  const goRead = () => {
    if (!onReadPage) router.push(`/book/${bookId}/read`);
  };

  const afterNavigate = (fn: () => void) => {
    if (onReadPage) queueMicrotask(fn);
    else window.setTimeout(fn, 180);
  };

  const jumpChat = () => {
    goRead();
    afterNavigate(() => openChat());
  };

  const jumpRelease = () => {
    goRead();
    afterNavigate(() => releasePending());
  };

  const jumpMap = () => {
    router.push(`/book/${bookId}/map`);
  };

  const jumpFinished = () => {
    router.push(`/book/${bookId}/finished`);
  };

  return (
    <div className="pointer-events-none fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-[120] flex flex-col items-start gap-2">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto flex min-w-[10.5rem] flex-col gap-1.5 rounded-2xl border border-border bg-background/95 p-2 shadow-[var(--shadow-soft)] backdrop-blur-md"
          >
            <p className="font-sans px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              导演模式
            </p>
            <DirectorBtn icon={MessageCircle} label="对话面板" onClick={jumpChat} />
            <DirectorBtn
              icon={Sparkles}
              label="悬念释放"
              onClick={jumpRelease}
            />
            <DirectorBtn icon={Map} label="阅读地图" onClick={jumpMap} />
            <DirectorBtn icon={BookMarked} label="读完页" onClick={jumpFinished} />
            <button
              type="button"
              onClick={() => {
                clearDirectorModeSession();
                setActive(false);
                setOpen(false);
              }}
              className="font-sans mt-1 flex items-center justify-center gap-1 rounded-xl py-2 text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
              退出导演
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
        aria-label={open ? "关闭导演菜单" : "打开导演菜单"}
        title="导演模式"
      >
        <Clapperboard className="size-5" strokeWidth={1.75} />
      </motion.button>
    </div>
  );
}

function DirectorBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof MessageCircle;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
      {label}
    </button>
  );
}
