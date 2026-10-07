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

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除评论失败" }, { status: 500 });
  }
}
