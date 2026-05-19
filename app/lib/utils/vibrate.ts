import { haptics } from "@/app/lib/haptics";

/** 保留：按毫秒模式震动（与旧调用兼容）。 */
export function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    vibrate?: (p: number | number[]) => boolean;
  };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** 设计系统触感（多脉冲节奏，见 `app/lib/haptics.ts`）。 */
export { haptics };
