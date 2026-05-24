import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.MINIMAX_PAYGO_KEY;
  if (!token) {
    return NextResponse.json({ error: "missing MINIMAX_PAYGO_KEY" }, { status: 500 });
  }

  const { paragraphText, artStyle } = (await req.json()) as {
    paragraphText: string;
    artStyle: string;
  };

  const styleClip = (artStyle ?? "").slice(0, 480);
  const sceneClip = (paragraphText ?? "").slice(0, 160);
  const prompt = `Cinematic book illustration. Art style: ${styleClip}. Scene: ${sceneClip}. No text, no captions, no logos.`;

  const body = {
    model: "image-01",
    prompt: prompt.slice(0, 1450),
    aspect_ratio: "3:4",
    response_format: "base64",
  };

  let res: Response;
  try {
    res = await fetch("https://api.minimax.io/v1/image_generation", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  const data = (await res.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { image_base64?: string[] };
  };

  const statusCode = data.base_resp?.status_code;
  if (statusCode !== undefined && statusCode !== 0) {
    return NextResponse.json(
      { error: data.base_resp?.status_msg ?? "image api error" },
      { status: 500 },
    );
  }

  const b64 = data.data?.image_base64?.[0];
  if (!b64) {
    return NextResponse.json({ error: "no image in response" }, { status: 500 });
  }

  return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
}
