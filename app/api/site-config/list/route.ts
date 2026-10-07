import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { DEFAULT_SITE_CONFIGS } from "@/app/lib/default-site-config";

export async function GET(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const configs = await prisma.siteConfig.findMany({
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        updated_at: true,
      },
      orderBy: { id: "asc" },
    });
    // 合并默认配置清单：数据库缺失的键自动补齐（如 websiteUrl），保证后台始终可配置
    const existingKeys = new Set(configs.map((c) => c.key));
    const merged = [...configs];
    for (const def of DEFAULT_SITE_CONFIGS) {
      if (!existingKeys.has(def.key)) {
        merged.push({
          id: 0,
          key: def.key,
          value: def.value,
          description: def.description,
          updated_at: null,
        });
      }
    }
    return NextResponse.json(merged);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    const status = message.includes("未登录") || message.includes("无效的令牌") ? 401 : 500;
    return NextResponse.json({ code: 1, message: "获取站点配置失败" }, { status });
  }
}
