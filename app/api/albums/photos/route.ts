import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.photo.create({
        data: {
          album_id: body.album_id,
          url: body.url,
          caption: body.caption || "",
          orientation: body.orientation || "landscape",
          sort: body.sort || 0,
        },
      });
      const count = await tx.photo.count({
        where: { album_id: body.album_id },
      });
      await tx.album.update({
        where: { id: body.album_id },
        data: { photo_count: count },
      });
      return created;
    });
    return NextResponse.json({ code: 0, message: "success", data: photo });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
