import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ catId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { catId } = await params;
    const id = Number(catId);
    const body = await request.json();
    // 更新时检查同名分类是否已存在（排除自身）
    if (body.name) {
      const existing = await prisma.bookmarkCategory.findFirst({
        where: { name: body.name, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { code: 1, message: `分类「${body.name}」已存在，请勿重复` },
          { status: 409 }
        );
      }
    }
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.description !== undefined) data.description = body.description;
    if (body.sort !== undefined) data.sort = body.sort;

    const category = await prisma.bookmarkCategory.update({
      where: { id },
      data,
    });
    return NextResponse.json({ code: 0, message: "success", data: category });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ catId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { catId } = await params;
    const id = Number(catId);
    await prisma.bookmarkCategory.delete({ where: { id } });
    return NextResponse.json({ code: 0, message: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
