import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: Request) {
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

    const musics = await prisma.music.findMany({
      where: { type: "local" },
      orderBy: { sort: "asc" },
    });

    return NextResponse.json(musics);
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Get local music error:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
