import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * 同步所有相册的 photo_count 字段
 * 通过实际统计 photo 表中每相册的照片数量来修正冗余字段
 * 用于修正历史数据不一致问题
 */
export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      select: { id: true, title: true, photo_count: true },
    });

    const updates: Array<{ id: number; title: string; old: number; new: number }> = [];

    for (const album of albums) {
      const realCount = await prisma.photo.count({
        where: { album_id: album.id },
      });
      if (realCount !== album.photo_count) {
        await prisma.album.update({
          where: { id: album.id },
          data: { photo_count: realCount },
        });
        updates.push({
          id: album.id,
          title: album.title,
          old: album.photo_count,
          new: realCount,
        });
      }
    }

    return NextResponse.json({
      code: 0,
      message: "同步完成",
      data: { fixed: updates.length, updates },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
