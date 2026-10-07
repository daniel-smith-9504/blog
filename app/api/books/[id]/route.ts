import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath } from "@/app/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: "无效的图书ID" }, { status: 400 });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { category: true },
    });

    if (!book) {
      return NextResponse.json({ error: "图书不存在" }, { status: 404 });
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { views: book.views + 1 },
    });

    return NextResponse.json({ book: { ...book, views: book.views + 1 } });
  } catch (err) {
    console.error("Book detail API error:", err);
    return NextResponse.json({ error: "获取图书详情失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(_request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const { id } = await params;
    const bookId = parseInt(id);
    if (isNaN(bookId)) {
      return NextResponse.json({ error: "无效的图书ID" }, { status: 400 });
    }

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return NextResponse.json({ error: "图书不存在" }, { status: 404 });
    }

    // 删除图书文件
    if (book.file_url) {
      await deleteFile(cleanUrlPath(book.file_url)).catch(() => {});
    }
    // 删除封面
    if (book.cover) {
      await deleteFile(cleanUrlPath(book.cover)).catch(() => {});
    }

    await prisma.book.delete({ where: { id: bookId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Book delete API error:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}