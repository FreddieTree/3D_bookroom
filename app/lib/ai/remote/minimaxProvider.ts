/**
 * MinimaxAiProvider —— 远端 Provider 占位（成员 2 维护）。
 *
 * 本期不实现。设置 `NEXT_PUBLIC_AI_PROVIDER=minimax` 时此实现被工厂启用，
 * 调用任一方法都会 throw，开发模式下能立刻发现「环境切错」。
 *
 * Phase 2 接入时需要：
 *   - 替换下面的 `throw` 为真正的 MiniMax M1 长上下文流式调用
 *   - 在服务端封装 API Key（通过 `app/api/chat/route.ts`），客户端只通过 SSE 拉
 *   - 网络/配额异常时 fallback 到 `LocalAiProvider`
 *
 * 保持接口签名与 `LocalAiProvider` 完全一致，零 UI 改动即可切换。
 */

import type {
  AiAnswer,
  AiContext,
  IAiProvider,
  PendingQuestion,
  SpoilerVerdict,
} from "@/app/lib/ai/types";

const NOT_IMPL_MSG =
  "MinimaxAiProvider 尚未实现。请在 Phase 2 接入或将 NEXT_PUBLIC_AI_PROVIDER 切回 'local'。";

export class MinimaxAiProvider implements IAiProvider {
  readonly name = "minimax";

  judgeSpoiler(_text: string, _ctx: AiContext): SpoilerVerdict {
    void _text;
    void _ctx;
    throw new Error(NOT_IMPL_MSG);
  }

  async streamAsk(
    _text: string,
    _ctx: AiContext,
    _onToken: (partial: string) => void,
  ): Promise<AiAnswer> {
    void _text;
    void _ctx;
    void _onToken;
    throw new Error(NOT_IMPL_MSG);
  }

  composeReleaseAnswer(
    _pending: PendingQuestion,
    _ctx: AiContext,
  ): AiAnswer {
    void _pending;
    void _ctx;
    throw new Error(NOT_IMPL_MSG);
  }
}
