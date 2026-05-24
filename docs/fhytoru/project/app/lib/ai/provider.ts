/**
 * AI Provider 工厂（成员 2 维护）。
 *
 * 默认走 `LocalAiProvider`。设置 `NEXT_PUBLIC_AI_PROVIDER=minimax` 启用远端实现。
 *
 * **重要**：此工厂返回的是单例。任何模块都应调用 `getAiProvider()`，
 * 不要 `new LocalAiProvider()`，避免索引被重复构建。
 */

import { LocalAiProvider } from "@/app/lib/ai/local";
import { MinimaxAiProvider } from "@/app/lib/ai/remote/minimaxProvider";
import type { IAiProvider } from "@/app/lib/ai/types";

export type AiProviderKind = "local" | "minimax";

function resolveKind(): AiProviderKind {
  const v = process.env.NEXT_PUBLIC_AI_PROVIDER;
  if (v === "minimax") return "minimax";
  return "local";
}

let cached: IAiProvider | null = null;

export function getAiProvider(): IAiProvider {
  if (cached) return cached;
  const kind = resolveKind();
  cached = kind === "minimax" ? new MinimaxAiProvider() : new LocalAiProvider();
  return cached;
}

/** 仅供测试与开发模式重置工厂缓存。 */
export function __resetAiProviderForTesting(): void {
  cached = null;
}
