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

    const notes = await prisma.bookNote.findMany({
      where: { book_id: bookId },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (err) {
    console.error("Get notes error:", err);
    return NextResponse.json({ error: "获取笔记失败" }, { status: 500 });
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
    const { chapter_id, text, note, color, cfi, chapter_title } = body;

    if (!text) {
      return NextResponse.json({ error: "缺少选中的文本" }, { status: 400 });
    }

    const created = await prisma.bookNote.create({
      data: {
        book_id: bookId,
        chapter_id: chapter_id ?? null,
        text,
        note: note ?? "",
        color: color ?? "#facc15",
        cfi: cfi ?? "",
        chapter_title: chapter_title ?? "",
      },
    });

    return NextResponse.json({ note: created });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Save note error:", err);
    return NextResponse.json({ error: "保存笔记失败" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const noteId = parseInt(searchParams.get("note_id") || "");
    if (isNaN(noteId)) {
      return NextResponse.json({ error: "无效的笔记ID" }, { status: 400 });
    }

    await prisma.bookNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Delete note error:", err);
    return NextResponse.json({ error: "删除笔记失败" }, { status: 500 });
  }
}
