import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 给前台播放本地音乐时用：根据 dbId 返回数据库里存的 LRC 文本
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dbId = Number(searchParams.get("dbId"));
  if (!Number.isFinite(dbId) || dbId <= 0) {
    return new Response("缺少 dbId 参数", { status: 400 });
  }

  const music = await prisma.music.findUnique({
    where: { id: dbId },
    select: { lrc: true },
  });

  if (!music || !music.lrc) {
    return new Response("暂无歌词", { status: 200 });
  }

  return new Response(music.lrc, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
