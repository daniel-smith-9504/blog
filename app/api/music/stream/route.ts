import { NextRequest } from "next/server";
import Meting from "@meting/core";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlId = searchParams.get("url_id");

  if (!urlId) {
    return new Response("缺少 url_id 参数", { status: 400 });
  }

  const meting = new Meting("netease");
  meting.format(true);

  try {
    const raw = await meting.url(urlId, 320);
    const data = JSON.parse(raw as string);
    const src = (data.url || "").replace(/^http:\/\//, "https://");

    if (!src) {
      return new Response("获取音乐链接失败", { status: 404 });
    }

    // 流式转发：实时拉取网易云最新链接，避免 CDN 过期
    const audioRes = await fetch(src, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://music.163.com/",
      },
    });

    if (!audioRes.ok) {
      return new Response("音乐资源不可用", { status: audioRes.status });
    }

    return new Response(audioRes.body, {
      status: 200,
      headers: {
        "Content-Type": audioRes.headers.get("Content-Type") || "audio/mpeg",
        "Content-Length": audioRes.headers.get("Content-Length") || "",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Music stream proxy error:", err);
    return new Response("流媒体代理失败", { status: 500 });
  }
}