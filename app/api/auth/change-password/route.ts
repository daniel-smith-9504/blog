import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ code: 1, message: "无效的令牌" }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { code: 1, message: "请填写旧密码和新密码" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { code: 1, message: "新密码长度不能少于 6 位" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { hashed_password: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { code: 1, message: "用户不存在" },
        { status: 404 }
      );
    }

    const match = verifyPassword(oldPassword, dbUser.hashed_password);
    if (!match) {
      return NextResponse.json(
        { code: 1, message: "旧密码不正确" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { hashed_password: hashPassword(newPassword) },
    });

    return NextResponse.json({
      code: 0,
      message: "密码修改成功",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "修改密码失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
