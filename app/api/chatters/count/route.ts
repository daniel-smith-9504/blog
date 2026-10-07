import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const where = status ? { status } : {};
    const count = await prisma.chatter.count({ where });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "获取说说总数失败" }, { status: 500 });
  }
}
