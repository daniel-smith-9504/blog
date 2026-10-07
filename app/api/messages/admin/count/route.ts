import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: Request) {
  try {
    await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const where = status ? { status } : {};
    const count = await prisma.message.count({ where });
    return NextResponse.json({ count });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "获取留言总数失败" }, { status: 500 });
  }
}
