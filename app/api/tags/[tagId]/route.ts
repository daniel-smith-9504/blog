import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    await getCurrentUser(req);
    const { tagId } = await params;
    const id = parseInt(tagId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的标签 ID" }, { status: 400 });
    }

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { name, slug } = body;

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        slug: slug !== undefined ? slug : undefined,
      },
    });

    return NextResponse.json(tag);
  } catch (err: any) {
    console.error("PUT /api/tags/[tagId] error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新标签失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    await getCurrentUser(req);
    const { tagId } = await params;
    const id = parseInt(tagId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的标签 ID" }, { status: 400 });
    }

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/tags/[tagId] error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除标签失败" }, { status: 500 });
  }
}
