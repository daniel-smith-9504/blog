import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.message.count({
      where: { status: "approved" },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "获取留言总数失败" }, { status: 500 });
  }
}
