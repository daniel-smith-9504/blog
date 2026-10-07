import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const p = await params;
    const commentId = parseInt(p.commentId);
    if (isNaN(commentId)) {
      return NextResponse.json({ error: "无效的评论ID" }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { likes: { decrement: 1 } },
    });

    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ error: "取消点赞失败" }, { status: 500 });
  }
}
