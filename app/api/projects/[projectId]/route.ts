import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath } from "@/app/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  let project;
  if (/^\d+$/.test(projectId)) {
    project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
    });
  } else {
    project = await prisma.project.findUnique({
      where: { slug: projectId },
    });
  }
  if (!project) {
    return NextResponse.json(
      { code: 1, message: "项目不存在" },
      { status: 404 }
    );
  }
  return NextResponse.json(project);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { projectId } = await params;
    const id = Number(projectId);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.description !== undefined) data.description = body.description;
    if (body.long_description !== undefined)
      data.long_description = body.long_description;
    if (body.cover_image !== undefined) data.cover_image = body.cover_image;
    if (body.tech_stack !== undefined)
      data.tech_stack =
        typeof body.tech_stack === "string"
          ? body.tech_stack
          : JSON.stringify(body.tech_stack);
    if (body.link_github !== undefined) data.link_github = body.link_github;
    if (body.link_gitee !== undefined) data.link_gitee = body.link_gitee;
    if (body.link_live !== undefined) data.link_live = body.link_live;
    if (body.link_docs !== undefined) data.link_docs = body.link_docs;
    if (body.status !== undefined) data.status = body.status;
    if (body.status_label !== undefined) data.status_label = body.status_label;
    if (body.is_featured !== undefined) data.is_featured = body.is_featured;
    if (body.sort !== undefined) data.sort = body.sort;

    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json({ code: 0, message: "success", data: project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await getCurrentUser(request);
    const { projectId } = await params;
    const id = Number(projectId);

    const project = await prisma.project.findUnique({ where: { id } });
    if (project && project.cover_image) {
      await deleteFile(cleanUrlPath(project.cover_image)).catch(() => {});
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ code: 0, message: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
