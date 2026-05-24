import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.MINIMAX_PAYGO_KEY;
  if (!token) {
    return NextResponse.json({ error: "missing MINIMAX_PAYGO_KEY" }, { status: 500 });
  }

  const { text, voiceId } = (await req.json()) as {
    text: string;
    voiceId: string;
  };

  const body = {
    model: "speech-2.8-hd",
    text: text.slice(0, 500),
    voice_setting: {
      voice_id: voiceId,
      speed: 0.9,
      vol: 0.9,
      pitch: 0,
      english_normalization: false,
    },
    audio_setting: {
      format: "mp3",
      sample_rate: 32000,
      bitrate: 128000,
      channel: 1,
    },
  };

  let res: Response;
  try {
    res = await fetch("https://api.minimax.io/v1/t2a_v2", {
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
    data?: { audio?: string };
  };

  const statusCode = data.base_resp?.status_code;
  if (statusCode !== undefined && statusCode !== 0) {
    return NextResponse.json(
      { error: data.base_resp?.status_msg ?? "tts api error" },
      { status: 500 },
    );
  }

  const hexAudio = data.data?.audio;
  if (!hexAudio) {
    return NextResponse.json({ error: "no audio in response" }, { status: 500 });
  }

  const audioBuffer = Buffer.from(hexAudio, "hex");
  return new NextResponse(audioBuffer, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
