import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    await getCurrentUser(request);
    const p = await params;
    const commentId = parseInt(p.commentId);
    if (isNaN(commentId)) {
      return NextResponse.json({ error: "无效的评论ID" }, { status: 400 });
    }

    const comment = await prisma.chatterComment.findUnique({
      where: { id: commentId },
      select: { chatter_id: true },
    });

    if (comment) {
      await prisma.chatterComment.delete({ where: { id: commentId } });
      await prisma.chatter.update({
        where: { id: comment.chatter_id },
        data: { comments_count: { decrement: 1 } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除评论失败" }, { status: 500 });
  }
}
