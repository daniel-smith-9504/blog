import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyPassword, createToken, createRefreshToken } from "@/app/lib/auth";
import {
  getLoginAttempts,
  recordLoginFailure,
  clearLoginAttempts
} from "@/app/lib/rate-limit";
import { recordLoginLog } from "@/app/lib/login-log";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { code: 1, message: "请输入用户名和密码" },
        { status: 400 }
      );
    }

    // 登录失败限制检查（按用户名）
    const attempts = getLoginAttempts(username);
    if (attempts.locked) {
      const minutes = Math.ceil(attempts.remainingTime / 60);
      return NextResponse.json(
        { code: 1, message: `登录失败次数过多，请 ${minutes} 分钟后再试` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });

    // 统一返回模糊错误，不泄露用户是否存在
    if (!user) {
      recordLoginFailure(username);
      try { await recordLoginLog({ request, userId: 0, username, summary: "登录失败：用户名或密码错误" }); } catch {}
      return NextResponse.json(
        { code: 1, message: "用户名或密码错误" },
        { status: 400 }
      );
    }

    const pwdMatch = verifyPassword(password, user.hashed_password);
    if (!pwdMatch) {
      const result = recordLoginFailure(username);
      if (result.locked) {
        try { await recordLoginLog({ request, userId: user.id, username, summary: "登录失败：失败次数过多，账户已锁定" }); } catch {}
        return NextResponse.json(
          { code: 1, message: "登录失败次数过多，请 5 分钟后再试" },
          { status: 429 }
        );
      }
      try { await recordLoginLog({ request, userId: user.id, username, summary: "登录失败：用户名或密码错误" }); } catch {}
      return NextResponse.json(
        { code: 1, message: "用户名或密码错误" },
        { status: 400 }
      );
    }

    // 登录成功，清除失败记录
    clearLoginAttempts(username);
    try { await recordLoginLog({ request, userId: user.id, username, summary: "登录成功" }); } catch {}

    const accessToken = await createToken({
      sub: String(user.id),
      username: user.username,
      type: "user"
    });
    const refreshToken = await createRefreshToken({
      sub: String(user.id),
      username: user.username,
    });
    const expires = Date.now() + 72 * 60 * 60 * 1000;

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        accessToken,
        refreshToken,
        expires,
        avatar: user.avatar,
        username: user.username,
        nickname: user.nickname,
        roles: user.is_admin ? ["admin"] : ["user"],
        permissions: user.is_admin ? ["*"] : []
      }
    });
  } catch {
    return NextResponse.json(
      { code: 1, message: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
