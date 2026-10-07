import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

function parseSitePlatforms(site: any) {
  if (!site) return site;
  try {
    if (typeof site.platforms === "string") {
      site.platforms = JSON.parse(site.platforms);
    }
  } catch {}
  return site;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const where = categoryId ? { category_id: Number(categoryId) } : {};
  const sites = await prisma.bookmarkSite.findMany({
    where,
    orderBy: { sort: "asc" },
  });
  return NextResponse.json(sites.map(parseSitePlatforms));
}

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const site = await prisma.bookmarkSite.create({
      data: {
        category_id: body.category_id,
        name: body.name,
        url: body.url,
        icon: body.icon || "",
        description: body.description || "",
        platforms: body.platforms
          ? typeof body.platforms === "string"
            ? body.platforms
            : JSON.stringify(body.platforms)
          : "[]",
        sort: body.sort || 0,
      },
    });
    return NextResponse.json({ code: 0, message: "success", data: parseSitePlatforms(site) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
