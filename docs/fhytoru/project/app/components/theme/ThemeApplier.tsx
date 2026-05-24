"use client";

import { useEffect } from "react";

import { useAppStore } from "@/app/lib/stores/appStore";

function applyThemeToDom(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  if (theme === "light") root.classList.add("theme-light");
  if (theme === "dark") root.classList.add("theme-dark");
}

/** Syncs reader theme preference to <html> classes vs. system appearance. */
export function ThemeApplier() {
  const theme = useAppStore((s) => s.readerSettings.theme);

  useEffect(() => {
    applyThemeToDom(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyThemeToDom("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  return null;
}
