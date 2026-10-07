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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    const chatters = await prisma.chatter.findMany({
      where: { status: "published" },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * size,
      take: size,
    });

    const parsed = chatters.map((c) => ({
      ...c,
      images: safeParseImages(c.images),
    }));

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "获取说说失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const { content, images, mood } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "缺少内容" }, { status: 400 });
    }

    const chatter = await prisma.chatter.create({
      data: {
        content: content.trim(),
        images: images ? JSON.stringify(images) : "[]",
        mood: mood || "",
        status: "published",
      },
    });

    return NextResponse.json(chatter, { status: 201 });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "创建说说失败" }, { status: 500 });
  }
}
