import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

// PUT /api/books/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
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
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的分类ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, description, sort } = body;

    const category = await prisma.bookCategory.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(sort !== undefined && { sort }),
      },
    });

    return NextResponse.json({ category });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "分类名称或Slug已存在" }, { status: 400 });
    }
    console.error("Update category error:", err);
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 });
  }
}

// DELETE /api/books/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
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
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的分类ID" }, { status: 400 });
    }

    await prisma.bookCategory.delete({ where: { id: categoryId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete category error:", err);
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 });
  }
}