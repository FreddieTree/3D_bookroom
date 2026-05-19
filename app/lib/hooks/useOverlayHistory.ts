"use client";

import { useEffect, useRef } from "react";

/**
 * Push a sentinel history entry while `open`; first browser "back"
 * invokes `onClose` without leaving the current route (modal dismiss).
 *
 * Closing via UI runs `history.back()` in cleanup only when entry was pushed.
 */
export function useOverlayHistoryBinding(
  open: boolean,
  onClose: () => void,
  token: string,
) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPop = () => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      onClose();
    };

    if (open) {
      window.history.pushState(
        { __appOverlay: token },
        "",
        window.location.href,
      );
      pushedRef.current = true;
      window.addEventListener("popstate", onPop);

      return () => {
        window.removeEventListener("popstate", onPop);
        if (pushedRef.current) {
          pushedRef.current = false;
          window.history.back();
        }
      };
    }

    pushedRef.current = false;
    return undefined;
  }, [open, onClose, token]);
}
