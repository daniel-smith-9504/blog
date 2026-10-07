import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function parseSitePlatforms(site: any) {
  if (!site) return site;
  try {
    if (typeof site.platforms === "string") {
      site.platforms = JSON.parse(site.platforms);
    }
  } catch {}
  return site;
}

export async function GET() {
  try {
    const categories = await prisma.bookmarkCategory.findMany({
      orderBy: { sort: "asc" },
      include: {
        sites: {
          orderBy: { sort: "asc" },
        },
      },
    });
    // 解析每个分类下每个站点的 platforms 字段
    const parsed = categories.map((cat) => ({
      ...cat,
      sites: cat.sites.map(parseSitePlatforms),
    }));
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("获取收藏夹失败:", error);
    // 表不存在时返回空数组而不是 500
    return NextResponse.json([]);
  }
}
