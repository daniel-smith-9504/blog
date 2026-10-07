import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

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

    const chapters = await prisma.bookChapter.findMany({
      where: { book_id: bookId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ chapters });
  } catch (err) {
    console.error("Get chapters error:", err);
    return NextResponse.json({ error: "获取章节失败" }, { status: 500 });
  }
}
