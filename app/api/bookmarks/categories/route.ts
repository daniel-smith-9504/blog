import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  const categories = await prisma.bookmarkCategory.findMany({
    orderBy: { sort: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    // 检查同名分类是否已存在
    const existing = await prisma.bookmarkCategory.findFirst({
      where: { name: body.name },
    });
    if (existing) {
      return NextResponse.json(
        { code: 1, message: `分类「${body.name}」已存在，请勿重复创建` },
        { status: 409 }
      );
    }
    const category = await prisma.bookmarkCategory.create({
      data: {
        name: body.name,
        icon: body.icon || "",
        description: body.description || "",
        sort: body.sort || 0,
      },
    });
    return NextResponse.json({ code: 0, message: "success", data: category });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
