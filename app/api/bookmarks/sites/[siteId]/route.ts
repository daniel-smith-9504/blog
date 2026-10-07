import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath } from "@/app/lib/r2";

function parseSitePlatforms(site: any) {
  if (!site) return site;
  try {
    if (typeof site.platforms === "string") {
      site.platforms = JSON.parse(site.platforms);
    }
  } catch {}
  return site;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { siteId } = await params;
    const id = Number(siteId);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.category_id !== undefined) data.category_id = body.category_id;
    if (body.name !== undefined) data.name = body.name;
    if (body.url !== undefined) data.url = body.url;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.description !== undefined) data.description = body.description;
    if (body.platforms !== undefined)
      data.platforms =
        typeof body.platforms === "string"
          ? body.platforms
          : JSON.stringify(body.platforms);
    if (body.sort !== undefined) data.sort = body.sort;

    const site = await prisma.bookmarkSite.update({ where: { id }, data });
    return NextResponse.json({ code: 0, message: "success", data: parseSitePlatforms(site) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { siteId } = await params;
    const id = Number(siteId);

    const site = await prisma.bookmarkSite.findUnique({ where: { id } });
    if (site && site.icon) {
      await deleteFile(cleanUrlPath(site.icon)).catch(() => {});
    }

    await prisma.bookmarkSite.delete({ where: { id } });
    return NextResponse.json({ code: 0, message: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
