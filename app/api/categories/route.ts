import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sort: "asc" },
    });
    return NextResponse.json(categories);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: "获取分类列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const { name, slug, description, sort } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "名称和 slug 不能为空" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || "",
        sort: sort || 0,
      },
    });

    return NextResponse.json(category);
  } catch (err: any) {
    console.error("POST /api/categories error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 });
  }
}
