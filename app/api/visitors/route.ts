import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 访客列表是动态数据，不允许 Next.js / CDN 缓存
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const size = Number(searchParams.get("size") || "20");
  const skip = (page - 1) * size;

  const visitors = await prisma.visitor.findMany({
    orderBy: { created_at: "desc" },
    skip,
    take: size,
  });
  // 兼容后台前端：{ code, data } 包装
  return NextResponse.json({ code: 0, data: visitors });
}

export async function DELETE() {
  await prisma.visitor.deleteMany();
  return NextResponse.json({ code: 0, message: "success" });
}
