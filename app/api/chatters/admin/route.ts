import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

function safeParseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    const where = status ? { status } : {};

    const [chatters, total] = await Promise.all([
      prisma.chatter.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.chatter.count({ where }),
    ]);

    const parsed = chatters.map((c) => ({
      ...c,
      images: safeParseImages(c.images),
    }));

    return NextResponse.json(parsed);
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "获取说说列表失败" }, { status: 500 });
  }
}
