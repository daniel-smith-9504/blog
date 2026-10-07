import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath } from "@/app/lib/r2";

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

    const chatter = await prisma.chatter.findUnique({
      where: { id: chatterId },
    });

    if (!chatter) {
      return NextResponse.json({ error: "说说不存在" }, { status: 404 });
    }

    return NextResponse.json(chatter);
  } catch {
    return NextResponse.json({ error: "获取说说详情失败" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ chatterId: string }> }
) {
  try {
    await getCurrentUser(request);
    const p = await params;
    const chatterId = parseInt(p.chatterId);
    if (isNaN(chatterId)) {
      return NextResponse.json({ error: "无效的说说ID" }, { status: 400 });
    }

    const body = await request.json();
    const { content, images, mood, status } = body;

    const chatter = await prisma.chatter.update({
      where: { id: chatterId },
      data: {
        content: content !== undefined ? content.trim() : undefined,
        images: images !== undefined ? JSON.stringify(images) : undefined,
        mood: mood !== undefined ? mood : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json(chatter);
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新说说失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chatterId: string }> }
) {
  try {
    await getCurrentUser(request);
    const p = await params;
    const chatterId = parseInt(p.chatterId);
    if (isNaN(chatterId)) {
      return NextResponse.json({ error: "无效的说说ID" }, { status: 400 });
    }

    const chatter = await prisma.chatter.findUnique({ where: { id: chatterId } });
    if (chatter && chatter.images) {
      try {
        const images = JSON.parse(chatter.images);
        if (Array.isArray(images)) {
          for (const url of images) {
            if (typeof url === "string") {
              await deleteFile(cleanUrlPath(url)).catch(() => {});
            }
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }

    await prisma.chatter.delete({ where: { id: chatterId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除说说失败" }, { status: 500 });
  }
}
