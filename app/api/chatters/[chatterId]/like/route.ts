import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatterId: string }> }
) {
  try {
    const p = await params;
    const chatterId = parseInt(p.chatterId);
    if (isNaN(chatterId)) {
      return NextResponse.json({ error: "无效的说说ID" }, { status: 400 });
    }

    const chatter = await prisma.chatter.update({
      where: { id: chatterId },
      data: { likes: { increment: 1 } },
    });

    return NextResponse.json(chatter);
  } catch {
    return NextResponse.json({ error: "点赞失败" }, { status: 500 });
  }
}
