import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const id = parseInt(postId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的文章 ID" }, { status: 400 });
    }

    const post = await prisma.post.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });

    return NextResponse.json({ likes: post.likes });
  } catch (err) {
    console.error("POST /api/posts/[postId]/like error:", err);
    return NextResponse.json({ error: "点赞失败" }, { status: 500 });
  }
}
