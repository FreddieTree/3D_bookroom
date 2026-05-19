import { flushSync } from "react-dom";

/** 无 View Transition 时等价于同步执行回调。Next / React 跳转建议配合 flushSync。 */
export function withViewTransition(navigate: () => void): void {
  if (typeof document === "undefined") {
    navigate();
    return;
  }

  const run = () => flushSync(navigate);

  const d = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };

  if (typeof d.startViewTransition !== "function") {
    run();
    return;
  }

  d.startViewTransition(run);
}
