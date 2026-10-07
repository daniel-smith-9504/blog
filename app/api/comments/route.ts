import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { decodeToken } from "@/app/lib/auth";
import { getClientIp } from "@/app/lib/utils";

async function getUserFromToken(request: Request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    const payload = await decodeToken(token);
    if (payload.type === "github") {
      const userId = parseInt(payload.sub as string);
      const ghUser = await prisma.gitHubUser.findUnique({ where: { id: userId } });
      if (ghUser) return { type: "github" as const, github_user_id: ghUser.id, name: ghUser.login, avatar: ghUser.avatar };
    }
    if (payload.type === "email" || payload.type === "anonymous") {
      return {
        type: "email" as const,
        email_user_name: (payload.sub as string) || (payload.email as string)?.split("@")[0] || "匿名用户",
        email_user_avatar: (payload.avatar as string) || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post_id, parent_id, content } = body;

    if (!post_id || !content || typeof content !== "string") {
      return NextResponse.json(
        { error: "缺少必要字段" },
        { status: 400 }
      );
    }

    const userInfo = await getUserFromToken(request);
    const ip = getClientIp(request);

    const data: Record<string, unknown> = {
      post_id: parseInt(post_id),
      parent_id: parent_id ? parseInt(parent_id) : null,
      content: content.trim(),
      ip,
      status: "approved",
    };

    if (userInfo?.type === "github") {
      data.github_user_id = userInfo.github_user_id;
    } else if (userInfo?.type === "email") {
      data.email_user_name = userInfo.email_user_name;
      data.email_user_avatar = userInfo.email_user_avatar;
    }

    const comment = await prisma.comment.create({
      data: data as any,
      include: { githubUser: true },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建评论失败" }, { status: 500 });
  }
}
