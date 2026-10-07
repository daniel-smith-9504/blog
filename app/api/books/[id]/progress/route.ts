import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: "无效的书籍ID" }, { status: 400 });
    }

    const progress = await prisma.readingProgress.findUnique({
      where: { book_id: bookId },
    });

    return NextResponse.json({ progress });
  } catch (err) {
    console.error("Get progress error:", err);
    return NextResponse.json({ error: "获取阅读进度失败" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: "无效的书籍ID" }, { status: 400 });
    }

    const body = await request.json();
    const { chapter_id, chapter_title, position } = body;

    const progress = await prisma.readingProgress.upsert({
      where: { book_id: bookId },
      update: {
        chapter_id: chapter_id ?? undefined,
        chapter_title: chapter_title ?? undefined,
        position: position ?? 0,
      },
      create: {
        book_id: bookId,
        chapter_id: chapter_id ?? null,
        chapter_title: chapter_title ?? "",
        position: position ?? 0,
      },
    });

    return NextResponse.json({ progress });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Save progress error:", err);
    return NextResponse.json({ error: "保存阅读进度失败" }, { status: 500 });
  }
}
