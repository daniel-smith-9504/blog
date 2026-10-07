import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const where: any = {};
    if (status) where.status = status;

    const count = await prisma.post.count({ where });
    return NextResponse.json({ count });
  } catch (err) {
    console.error("GET /api/posts/count error:", err);
    return NextResponse.json({ error: "获取文章数量失败" }, { status: 500 });
  }
}
