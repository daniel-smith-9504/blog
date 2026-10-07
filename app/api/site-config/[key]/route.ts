import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { clearSiteConfigCache } from "@/app/lib/site-config-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const config = await prisma.siteConfig.findUnique({
    where: { key },
  });
  if (!config) {
    return NextResponse.json(
      { code: 1, message: "配置不存在" },
      { status: 404 }
    );
  }
  return NextResponse.json(config);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await getCurrentUser(request);
    const { key } = await params;
    const body = await request.json();
    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: {
        value: body.value,
        description: body.description,
      },
      create: {
        key,
        value: body.value,
        description: body.description,
      },
    });
    clearSiteConfigCache();
    return NextResponse.json({ code: 0, message: "success", data: config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await getCurrentUser(request);
    const { key } = await params;
    await prisma.siteConfig.delete({ where: { key } });
    clearSiteConfigCache();
    return NextResponse.json({ code: 0, message: "success" });
  } catch (err: unknown) {
    // 数据库无记录的虚拟配置项（默认清单合并项）删除时视为成功，避免报错
    const message = err instanceof Error ? err.message : "未知错误";
    if (message.includes("P2025") || message.includes("not found")) {
      return NextResponse.json({ code: 0, message: "success" });
    }
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
