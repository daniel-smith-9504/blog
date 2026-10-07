import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ catId: string }> }
) {
  try {
    await getCurrentUser(req);
    const { catId } = await params;
    const id = parseInt(catId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的分类 ID" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { name, slug, description, sort } = body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        slug: slug !== undefined ? slug : undefined,
        description: description !== undefined ? description : undefined,
        sort: sort !== undefined ? sort : undefined,
      },
    });

    return NextResponse.json(category);
  } catch (err: any) {
    console.error("PUT /api/categories/[catId] error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ catId: string }> }
) {
  try {
    await getCurrentUser(req);
    const { catId } = await params;
    const id = parseInt(catId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的分类 ID" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/categories/[catId] error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 });
  }
}
