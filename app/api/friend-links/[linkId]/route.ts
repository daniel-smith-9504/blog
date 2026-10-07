import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath } from "@/app/lib/r2";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { linkId } = await params;
    const id = Number(linkId);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.url !== undefined) data.url = body.url;
    if (body.avatar !== undefined) data.avatar = body.avatar;
    if (body.description !== undefined) data.description = body.description;
    if (body.sort !== undefined) data.sort = body.sort;
    if (body.is_approved !== undefined) data.is_approved = body.is_approved;

    const link = await prisma.friendLink.update({ where: { id }, data });
    return NextResponse.json({ code: 0, message: "success", data: link });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { linkId } = await params;
    const id = Number(linkId);

    const link = await prisma.friendLink.findUnique({ where: { id } });
    if (link && link.avatar) {
      await deleteFile(cleanUrlPath(link.avatar)).catch(() => {});
    }

    await prisma.friendLink.delete({ where: { id } });
    return NextResponse.json({ code: 0, message: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
