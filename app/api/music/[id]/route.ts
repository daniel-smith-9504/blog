import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { uploadFile, deleteFile, cleanUrlPath, generateFileName } from "@/app/lib/r2";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const { id } = await params;
    const musicId = parseInt(id);
    if (isNaN(musicId)) {
      return NextResponse.json({ error: "无效的ID" }, { status: 400 });
    }

    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music) {
      return NextResponse.json({ error: "音乐不存在" }, { status: 404 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string | null;
    const artist = formData.get("artist") as string | null;
    const sortStr = formData.get("sort") as string | null;
    const coverFile = formData.get("cover") as File | null;
    const lrcFile = formData.get("lrc") as File | null;

    const data: any = {};
    if (title !== null) data.title = title;
    if (artist !== null) data.artist = artist;
    if (sortStr !== null) data.sort = parseInt(sortStr) || 0;

    if (coverFile) {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const coverName = generateFileName(ext);
      const coverKey = `uploads/${coverName}`;
      const coverBytes = await coverFile.arrayBuffer();
      data.cover = await uploadFile(coverKey, coverBytes, coverFile.type);
    }

    if (lrcFile) {
      const lrcName = generateFileName("lrc");
      const lrcKey = `uploads/${lrcName}`;
      const lrcBytes = await lrcFile.arrayBuffer();
      data.lrcSrc = await uploadFile(lrcKey, lrcBytes, "text/plain");
      data.lrc = new TextDecoder().decode(lrcBytes);
    }

    const updated = await prisma.music.update({
      where: { id: musicId },
      data,
    });

    return NextResponse.json({ success: true, music: updated });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Update music error:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const { id } = await params;
    const musicId = parseInt(id);
    if (isNaN(musicId)) {
      return NextResponse.json({ error: "无效的ID" }, { status: 400 });
    }

    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music) {
      return NextResponse.json({ error: "音乐不存在" }, { status: 404 });
    }

    // 删除音频文件
    if (music.src) {
      const key = cleanUrlPath(music.src);
      await deleteFile(key).catch(() => {});
    }
    // 删除封面
    if (music.cover) {
      const key = cleanUrlPath(music.cover);
      await deleteFile(key).catch(() => {});
    }
    // 删除歌词文件
    if (music.lrcSrc) {
      const key = cleanUrlPath(music.lrcSrc);
      await deleteFile(key).catch(() => {});
    }

    await prisma.music.delete({ where: { id: musicId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Delete music error:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}