import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

// POST /api/books/categories - Create category
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, slug, description, sort } = body;

    if (!name) {
      return NextResponse.json({ error: "缺少分类名称" }, { status: 400 });
    }

    const category = await prisma.bookCategory.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description: description || "",
        sort: sort || 0,
      },
    });

    return NextResponse.json({ category });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "分类名称或Slug已存在" }, { status: 400 });
    }
    console.error("Create category error:", err);
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 });
  }
}