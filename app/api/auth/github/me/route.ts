import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { decodeToken } from "@/app/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const token = auth.slice(7);
    const payload = await decodeToken(token);
    if (payload.type !== "github") {
      return NextResponse.json(
        { error: "无效的令牌类型" },
        { status: 401 }
      );
    }

    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "无效的令牌" },
        { status: 401 }
      );
    }

    const githubUser = await prisma.gitHubUser.findUnique({
      where: { id: userId },
    });
    if (!githubUser) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: githubUser.id,
      login: githubUser.login,
      avatar: githubUser.avatar,
      bio: githubUser.bio,
    });
  } catch (err: any) {
    if (err.message === "无效的令牌") {
      return NextResponse.json(
        { error: err.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    );
  }
}
