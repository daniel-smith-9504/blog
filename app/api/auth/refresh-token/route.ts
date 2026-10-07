import { NextResponse } from "next/server";
import { decodeToken, createToken, createRefreshToken } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { code: 1, message: "缺少 refreshToken" },
        { status: 400 }
      );
    }

    // 验证 refresh token
    const payload = await decodeToken(refreshToken);

    if (payload.type !== "refresh") {
      return NextResponse.json(
        { code: 1, message: "无效的 refreshToken" },
        { status: 401 }
      );
    }

    // 签发新的 access token
    const newAccessToken = await createToken({
      sub: payload.sub,
      username: payload.username,
      type: "user",
    });

    // 同时轮换 refresh token（refresh token rotation）
    const newRefreshToken = await createRefreshToken({
      sub: payload.sub,
      username: payload.username,
    });

    const expires = Date.now() + 72 * 60 * 60 * 1000;

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expires,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 1, message: "Token 刷新失败" },
      { status: 401 }
    );
  }
}
