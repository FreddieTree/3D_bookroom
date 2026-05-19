/** Leading-edge throttle for scroll etc. */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let last = 0;
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      if (t) {
        clearTimeout(t);
        t = null;
      }
      last = now;
      fn(...args);
      return;
    }
    if (t) return;
    t = setTimeout(() => {
      last = Date.now();
      t = null;
      fn(...args);
    }, remaining);
  };
}
