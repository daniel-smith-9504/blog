import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getFile, cleanUrlPath } from "@/app/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const musicId = parseInt(id);
    if (isNaN(musicId)) {
      return NextResponse.json({ error: "无效的ID" }, { status: 400 });
    }

    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music || music.type !== "local") {
      return NextResponse.json({ error: "音乐不存在或无法下载" }, { status: 404 });
    }

    const key = cleanUrlPath(music.src);
    const result = await getFile(key);

    if (!result) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const ext = music.src.split(".").pop() || "mp3";
    const safeTitle = encodeURIComponent(music.title).replace(/%20/g, " ");

    return new Response(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}.${ext}"`,
        "Content-Length": String(result.buffer.byteLength),
      },
    });
  } catch (err: any) {
    console.error("Download music error:", err);
    return NextResponse.json({ error: "下载失败" }, { status: 500 });
  }
}