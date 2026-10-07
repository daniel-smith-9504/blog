import { NextRequest } from "next/server";
import Meting from "@meting/core";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lyricId = searchParams.get("lyric_id");

  if (!lyricId) {
    return new Response("缺少 lyric_id 参数", { status: 400 });
  }

  const meting = new Meting("netease");
  meting.format(true);

  try {
    const raw = await meting.lyric(lyricId);
    const data = JSON.parse(raw as string);
    const lrc = data.lyric || data.lrc || "";

    if (!lrc) {
      return new Response("暂无歌词", { status: 200 });
    }

    return new Response(lrc, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Lyric proxy error:", err);
    return new Response("歌词获取失败", { status: 500 });
  }
}