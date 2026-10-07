import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  const links = await prisma.friendLink.findMany({
    where: { is_approved: true },
    orderBy: { sort: "asc" },
  });
  return NextResponse.json(links);
}

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const link = await prisma.friendLink.create({
      data: {
        name: body.name,
        url: body.url,
        avatar: body.avatar || "",
        description: body.description || "",
        sort: body.sort || 0,
        is_approved: body.is_approved ?? false,
      },
    });
    return NextResponse.json({ code: 0, message: "success", data: link });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
