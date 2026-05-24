/**
 * Build-time public flags (NEXT_PUBLIC_*), safe on client & server.
 */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** AI 逐字延迟：演示模式瞬时完成 */
export function demoCharTickMs(normalMs: number): number {
  return IS_DEMO_MODE ? 0 : normalMs;
}

/** 生成等待最短时长 */
export function demoGenerationMinMs(normalMs: number): number {
  return IS_DEMO_MODE ? 0 : normalMs;
}

/** 轮播文案间隔 */
export function demoGenerationLineIntervalMs(normalMs: number): number {
  return IS_DEMO_MODE ? 60 : normalMs;
}

/** 骨架屏后延迟 */
export function demoImageSkeletonMs(normalMs: number): number {
  return IS_DEMO_MODE ? 0 : normalMs;
}

const DIRECTOR_SS_KEY = "sanweishuwu-demo-director";

/** 从 URL ?demo=director 打开导演模式并写入 session（导航不丢） */
export function persistDirectorModeFromSearch(search: string): void {
  if (!IS_DEMO_MODE || typeof window === "undefined") return;
  try {
    const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    if (q.get("demo") === "director") {
      sessionStorage.setItem(DIRECTOR_SS_KEY, "1");
    }
  } catch {
    /* ignore */
  }
}

export function clearDirectorModeSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DIRECTOR_SS_KEY);
  } catch {
    /* ignore */
  }
}

export function isDirectorModeSession(): boolean {
  if (!IS_DEMO_MODE || typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DIRECTOR_SS_KEY) === "1";
  } catch {
    return false;
  }
}
