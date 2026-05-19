"use client";

import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "@/app/lib/utils";

type SideModalProps = {
  open: boolean;
  onClose: () => void;
  side: "left" | "right" | "bottom";
  /** Optional header shown above children */
  title?: string;
  children: ReactNode;
  panelClassName?: string;
  nestedLayout?: boolean;
};

export function SideModal({
  open,
  onClose,
  side,
  title,
  children,
  panelClassName,
  nestedLayout = false,
}: SideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (side === "right") {
      const dx = info.offset.x;
      if (dx > 90 || info.velocity.x > 420 || (dx > 40 && info.velocity.x > 120))
        onClose();
    } else if (side === "left") {
      const dx = info.offset.x;
      if (dx < -90 || info.velocity.x < -420 || (dx < -40 && info.velocity.x < -120))
        onClose();
    } else {
      const dy = info.offset.y;
      if (dy > 120 || info.velocity.y > 520 || (dy > 48 && info.velocity.y > 180))
        onClose();
    }
  };

  const initial =
    side === "right"
      ? { x: "100%" }
      : side === "left"
        ? { x: "-100%" }
        : { y: "100%" };

  const animate = { x: 0, y: 0 };
  const exit =
    side === "right"
      ? { x: "100%" }
      : side === "left"
        ? { x: "-100%" }
        : { y: "100%" };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭浮层背景"
            className="fixed inset-0 z-[85] bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-labelledby={title ? "side-modal-title" : undefined}
            className={cn(
              "font-sans fixed z-[90] flex flex-col bg-background shadow-[var(--shadow-soft)]",
              side === "bottom"
                ? "bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-2xl border border-border pb-[max(env(safe-area-inset-bottom),0.5rem)]"
                : "bottom-0 top-0 border-border bg-background",
              side === "right"
                ? "right-0 w-[min(100vw-1.25rem,26rem)] border-l"
                : "",
              side === "left"
                ? "left-0 w-[min(100vw-1.25rem,26rem)] border-r"
                : "",
              panelClassName,
            )}
            style={{
              paddingTop: nestedLayout
                ? 0
                : "max(env(safe-area-inset-top),0.65rem)",
            }}
            initial={initial}
            animate={animate}
            exit={exit}
            drag={side === "bottom" ? "y" : "x"}
            dragConstraints={
              side === "bottom"
                ? { top: 0 }
                : side === "right"
                  ? { left: 0 }
                  : { right: 0 }
            }
            dragElastic={
              side === "bottom"
                ? { top: 0, bottom: 0.72 }
                : side === "right"
                  ? { left: 0, right: 1 }
                  : { left: 1, right: 0 }
            }
            onDragEnd={onDragEnd}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 36,
              mass: 0.65,
            }}
          >
            {title ? (
              <header
                className={cn(
                  "flex shrink-0 items-center gap-3 border-b border-border px-4 pb-3",
                  nestedLayout
                    ? "pt-[max(0.65rem,env(safe-area-inset-top))]"
                    : "pt-2",
                )}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="-ml-1 flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="关闭"
                >
                  <X className="size-5 stroke-[1.75]" />
                </button>
                <h2 id="side-modal-title" className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {title}
                </h2>
              </header>
            ) : (
              <div
                className={cn(
                  "flex shrink-0 justify-end px-2",
                  nestedLayout
                    ? "pt-[max(0.65rem,env(safe-area-inset-top))]"
                    : "pt-0",
                )}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="关闭"
                >
                  <X className="size-5 stroke-[1.75]" />
                </button>
              </div>
            )}
            <div
              className={cn(
                "min-h-0 flex-1",
                nestedLayout
                  ? "flex flex-col overflow-hidden"
                  : "overflow-y-auto overscroll-contain",
              )}
            >
              {children}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
