import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const links = await prisma.friendLink.findMany({
      orderBy: { sort: "asc" },
    });
    return NextResponse.json(links);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
