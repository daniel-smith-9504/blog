import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: Request) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json(
        { code: 1, message: "无效的令牌" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { code: 1, message: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        bio: user.bio,
        is_admin: user.is_admin,
        roles: user.is_admin ? ["admin"] : ["user"],
        permissions: user.is_admin ? ["*"] : [],
      },
    });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json(
        { code: 1, message: err.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { code: 1, message: "获取用户信息失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json(
        { code: 1, message: "无效的令牌" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname, email, bio, avatar } = body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(email !== undefined && { email }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
      },
    });

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        bio: user.bio,
      },
    });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json(
        { code: 1, message: err.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { code: 1, message: "更新用户信息失败" },
      { status: 500 }
    );
  }
}
