/**
 * /api/chat —— Anthropic-compatible 网关代理（成员 2 维护）。
 *
 * 客户端 POST { system, messages } → 本路由把请求转发到
 * `${MINIMAX_BASE_URL}/v1/messages` 并开启 stream。网关返回 SSE，
 * 我们边读边把 `content_block_delta` 事件的 `delta.text` 提取出来，
 * 以 NDJSON 形式（每行 `{"type":"delta","text":"…"}`）回写客户端。
 *
 * 这样做的好处：
 *   - 凭据完全留在 server（process.env），客户端 bundle 不含
 *   - 输出格式收敛成单一 `delta.text` 串，客户端不必感知 Anthropic SSE 协议细节
 *   - 错误统一成 `{"type":"error","message":"…"}` 一行，前端 fallback 容易
 *
 * env 命名为什么用 MINIMAX_* 而不是 ANTHROPIC_*：见
 * docs/member-2-ai/README.md §11.2（避免被系统级 ANTHROPIC_* 覆盖 .env.local）。
 */
export const runtime = "nodejs";

interface ChatRequestBody {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 4096;

export async function POST(req: Request): Promise<Response> {
  const baseUrl = process.env.MINIMAX_BASE_URL;
  const authToken = process.env.MINIMAX_AUTH_TOKEN;
  const model = process.env.MINIMAX_MODEL;

  if (!baseUrl || !authToken || !model) {
    return jsonError(
      "MINIMAX_BASE_URL / MINIMAX_AUTH_TOKEN / MINIMAX_MODEL 未配置",
      500,
    );
  }
  console.log(`[/api/chat] using model = ${model}, base = ${baseUrl}`);

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return jsonError("请求体不是合法 JSON", 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError("messages 必须为非空数组", 400);
  }

  const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/v1/messages`;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": authToken,
        "anthropic-version": "2023-06-01",
        // 兼容部分网关使用 Bearer
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: body.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: body.system,
        messages: body.messages,
        stream: true,
      }),
    });
  } catch (e) {
    return jsonError(`无法连接网关：${(e as Error).message}`, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "<empty>");
    return jsonError(
      `网关错误 ${upstream.status}：${text.slice(0, 400)}`,
      502,
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE 事件以双换行分隔
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const delta = extractTextDelta(rawEvent);
            if (delta) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "delta", text: delta }) + "\n",
                ),
              );
            }
          }
        }
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              message: (e as Error).message,
            }) + "\n",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function extractTextDelta(rawEvent: string): string | null {
  // 每条 SSE 事件由若干 `field: value` 行组成；我们只关心 data 行
  const dataLines: string[] = [];
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  const data = dataLines.join("\n");
  if (!data || data === "[DONE]") return null;
  try {
    const obj = JSON.parse(data);
    if (obj?.type === "content_block_delta" && obj?.delta?.type === "text_delta") {
      return typeof obj.delta.text === "string" ? obj.delta.text : null;
    }
    // 一些兼容实现可能直接返回 OpenAI 风格 chunk
    if (Array.isArray(obj?.choices)) {
      const t = obj.choices[0]?.delta?.content;
      return typeof t === "string" && t.length > 0 ? t : null;
    }
    return null;
  } catch {
    return null;
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ type: "error", message }) + "\n",
    {
      status,
      headers: { "content-type": "application/x-ndjson; charset=utf-8" },
    },
  );
}
