import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { post_count: "desc" },
    });
    return NextResponse.json(tags);
  } catch (err) {
    console.error("GET /api/tags error:", err);
    return NextResponse.json({ error: "获取标签列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "名称和 slug 不能为空" },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: { name, slug },
    });

    return NextResponse.json(tag);
  } catch (err: any) {
    console.error("POST /api/tags error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "创建标签失败" }, { status: 500 });
  }
}
