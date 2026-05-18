/**
 * 本地引擎流式输出（成员 2 维护）。
 *
 * 与远端真 SSE 的不同：这里只是 setTimeout 模拟逐字推送，
 * 让 UI 表现与未来的 MiniMax 流式一致。Demo 模式（NEXT_PUBLIC_DEMO_MODE=true）
 * 下瞬时完成，不影响路演节奏。
 */

import { legacyStreamChars } from "@/app/lib/ai/local/legacyAdapter";

/**
 * 逐字流式输出。直接复用 legacy 实现以避免出现两套时钟。
 */
export const streamChars = legacyStreamChars;
