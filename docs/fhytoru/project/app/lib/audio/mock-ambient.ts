/**
 * TODO(成员3): 替换为真实章节 BGM / 混音管线。保留 `startMockAmbient` / `fadeOut` 语义即可。
 * Mock：Web Audio 极低音量正弦 + 轻微失谐层，避免外链音频与版权顾虑。
 */

export type MockAmbientHandle = {
  stop: () => void;
  fadeOutAndStop: (durationMs: number) => void;
};

function ensureCtx(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext unavailable");
  }
  const AC =
    window.AudioContext ||
    (
      window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AC) throw new Error("AudioContext unsupported");
  return new AC();
}

let sharedCtx: AudioContext | null = null;

export function resumeAudioContext(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!sharedCtx) sharedCtx = ensureCtx();
  if (sharedCtx.state === "suspended") return sharedCtx.resume();
  return Promise.resolve();
}

export function startMockAmbient(options?: {
  durationCapMs?: number;
  gain?: number;
}): MockAmbientHandle {
  const ctx = sharedCtx ?? ensureCtx();
  sharedCtx = ctx;

  const master = ctx.createGain();
  const gain = options?.gain ?? 0.07;
  master.gain.value = gain;
  master.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(174, ctx.currentTime);
  osc1.connect(master);

  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(177, ctx.currentTime);
  const g2 = ctx.createGain();
  g2.gain.value = 0.35;
  osc2.connect(g2);
  g2.connect(master);

  osc1.start();
  osc2.start();

  const cap = options?.durationCapMs ?? 30_000;
  let capTimer: number | null = null;
  if (cap < 1e9) {
    capTimer = window.setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
      } catch {
        /* already stopped */
      }
      master.disconnect();
    }, cap);
  }

  const teardown = () => {
    if (capTimer) window.clearTimeout(capTimer);
    capTimer = null;
    try {
      osc1.stop();
      osc2.stop();
    } catch {
      /* */
    }
    master.disconnect();
  };

  return {
    stop: teardown,
    fadeOutAndStop: (durationMs: number) => {
      const now = ctx.currentTime;
      const tEnd = now + Math.max(0.05, durationMs / 1000);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, tEnd);
      window.setTimeout(teardown, durationMs + 80);
    },
  };
}
