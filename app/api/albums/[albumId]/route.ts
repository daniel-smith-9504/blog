import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath } from "@/app/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const { albumId } = await params;
  const id = Number(albumId);
  const album = await prisma.album.findUnique({
    where: { id },
    include: { photos: { orderBy: { sort: "asc" } } },
  });
  if (!album) {
    return NextResponse.json({ code: 1, message: "相册不存在" }, { status: 404 });
  }
  return NextResponse.json(album);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { albumId } = await params;
    const id = Number(albumId);
    const body = await request.json();
    const album = await prisma.album.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        cover: body.cover,
        sort: body.sort,
      },
    });
    return NextResponse.json({ code: 0, message: "success", data: album });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { albumId } = await params;
    const id = Number(albumId);

    // 先删除相册内所有照片对应的 R2 文件
    const photos = await prisma.photo.findMany({ where: { album_id: id } });
    for (const photo of photos) {
      if (photo.url) {
        await deleteFile(cleanUrlPath(photo.url)).catch(() => {});
      }
    }

    // 级联删除数据库记录
    await prisma.photo.deleteMany({ where: { album_id: id } });
    await prisma.album.delete({ where: { id } });
    return NextResponse.json({ code: 0, message: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
