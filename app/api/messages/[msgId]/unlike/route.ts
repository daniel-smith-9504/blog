import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ msgId: string }> }
) {
  try {
    const p = await params;
    const msgId = parseInt(p.msgId);
    if (isNaN(msgId)) {
      return NextResponse.json({ error: "无效的留言ID" }, { status: 400 });
    }

    const message = await prisma.message.update({
      where: { id: msgId },
      data: { likes: { decrement: 1 } },
    });

    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "取消点赞失败" }, { status: 500 });
  }
}
