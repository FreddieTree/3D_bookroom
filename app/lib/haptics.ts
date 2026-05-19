/** iOS / Web 震动（多脉冲近似「触感」；无 API 时静默）。 */
export const haptics = {
  light: () => void invoke(8),
  medium: () => void invoke(15),
  strong: () => void invoke(25),
  doubleTap: () => void invoke([8, 40, 8]),
  success: () => void invoke([5, 30, 15]),
  error: () => void invoke([20, 50, 20]),
  selection: () => void invoke(5),
  longPressStart: () => void invoke([5, 20, 10, 20, 15]),
};

function invoke(pattern: number | number[]): void {
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
