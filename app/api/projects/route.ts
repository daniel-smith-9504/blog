import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { sort: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const project = await prisma.project.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || "",
        long_description: body.long_description || "",
        cover_image: body.cover_image || "",
        tech_stack: body.tech_stack ? JSON.stringify(body.tech_stack) : "[]",
        link_github: body.link_github || "",
        link_gitee: body.link_gitee || "",
        link_live: body.link_live || "",
        link_docs: body.link_docs || "",
        status: body.status || "developing",
        status_label: body.status_label || "",
        is_featured: body.is_featured || false,
        sort: body.sort || 0,
      },
    });
    return NextResponse.json({ code: 0, message: "success", data: project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
