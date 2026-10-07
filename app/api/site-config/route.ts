import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { clearSiteConfigCache } from "@/app/lib/site-config-db";
import { DEFAULT_SITE_CONFIGS } from "@/app/lib/default-site-config";

// 强制动态渲染，不缓存任何内容
export const dynamic = "force-dynamic";

export async function GET() {
  const configs = await prisma.siteConfig.findMany();
  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.key] = c.value;
  }
  // 合并默认配置清单：数据库缺失的键使用默认值，保证前台始终可读取（如 websiteUrl）
  for (const def of DEFAULT_SITE_CONFIGS) {
    if (result[def.key] === undefined) {
      result[def.key] = def.value;
    }
  }
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const config = await prisma.siteConfig.create({
      data: {
        key: body.key,
        value: body.value || "",
        description: body.description || "",
      },
    });
    clearSiteConfigCache();
    return NextResponse.json({ code: 0, message: "success", data: config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const updated: unknown[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string") continue;
      const config = await prisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value, description: "" },
      });
      updated.push(config);
    }
    clearSiteConfigCache();
    return NextResponse.json({ code: 0, message: "success", data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
