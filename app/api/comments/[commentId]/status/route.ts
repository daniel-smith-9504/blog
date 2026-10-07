import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function PUT(
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

    const body = await request.json();
    const { status } = body;
    if (!status) {
      return NextResponse.json({ error: "缺少状态字段" }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { status },
    });

    return NextResponse.json(comment);
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新评论状态失败" }, { status: 500 });
  }
}
