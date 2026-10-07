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
      if (ghUser) {
        return { type: "github" as const, user: ghUser };
      }
    }
    if (payload.type === "email" || payload.type === "anonymous") {
      return {
        type: "email" as const,
        email: payload.email as string,
        login: (payload.sub as string) || (payload.email as string)?.split("@")[0] || "匿名用户",
        avatar: payload.avatar as string || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

function buildMessageTree(
  messages: any[],
  parentId: number | null = null
): any[] {
  return messages
    .filter((m) => m.parent_id === parentId)
    .map((m) => ({
      ...m,
      replies: buildMessageTree(messages, m.id),
    }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    const messages = await prisma.message.findMany({
      where: { status: "approved" },
      include: { githubUser: true },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * size,
      take: size,
    });

    const tree = buildMessageTree(messages);
    return NextResponse.json(tree);
  } catch {
    return NextResponse.json({ error: "获取留言失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, parent_id } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "缺少内容" }, { status: 400 });
    }

    const userInfo = await getUserFromToken(request);
    const ip = getClientIp(request);

    const data: any = {
      content: content.trim(),
      parent_id: parent_id ? parseInt(parent_id) : null,
      ip,
      status: "approved",
    };

    if (userInfo?.type === "github") {
      data.github_user_id = userInfo.user.id;
    } else if (userInfo?.type === "email") {
      data.email_user_name = userInfo.login;
      data.email_user_avatar = userInfo.avatar;
    }

    const message = await prisma.message.create({
      data,
      include: { githubUser: true },
    });

    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建留言失败" }, { status: 500 });
  }
}
