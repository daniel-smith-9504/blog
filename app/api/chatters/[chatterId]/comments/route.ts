import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function buildCommentTree(
  comments: any[],
  parentId: number | null = null
): any[] {
  return comments
    .filter((c) => c.parent_id === parentId)
    .map((c) => ({
      ...c,
      replies: buildCommentTree(comments, c.id),
    }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatterId: string }> }
) {
  try {
    const p = await params;
    const chatterId = parseInt(p.chatterId);
    if (isNaN(chatterId)) {
      return NextResponse.json({ error: "无效的说说ID" }, { status: 400 });
    }

    const comments = await prisma.chatterComment.findMany({
      where: { chatter_id: chatterId, status: "approved" },
      include: { githubUser: true },
      orderBy: { created_at: "asc" },
    });

    const tree = buildCommentTree(comments);
    return NextResponse.json(tree);
  } catch {
    return NextResponse.json({ error: "获取评论失败" }, { status: 500 });
  }
}
