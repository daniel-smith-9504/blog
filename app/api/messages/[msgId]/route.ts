import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ msgId: string }> }
) {
  try {
    await getCurrentUser(request);
    const p = await params;
    const msgId = parseInt(p.msgId);
    if (isNaN(msgId)) {
      return NextResponse.json({ error: "无效的留言ID" }, { status: 400 });
    }

    await prisma.message.delete({ where: { id: msgId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除留言失败" }, { status: 500 });
  }
}
