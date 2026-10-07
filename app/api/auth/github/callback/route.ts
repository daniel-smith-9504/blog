import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { SignJWT } from "jose";
import { createToken } from "@/app/lib/auth";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SECRET_KEY || "default-secret-key-change-me"
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state") || "";
    const isAdminLogin = state === "admin";

    if (!code) {
      return NextResponse.json(
        { error: "缺少 code 参数" },
        { status: 400 }
      );
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "GitHub OAuth 未配置" },
        { status: 500 }
      );
    }

    // 1) 获取 access_token（从请求 URL 动态获取回调地址，兼容不同域名的部署）
    const requestUrl = new URL(request.url);
    const redirectUri = `${requestUrl.origin}/api/auth/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json(
        {
          error: "获取 GitHub access_token 失败",
          github_error: tokenData.error,
          github_description: tokenData.error_description,
        },
        { status: 400 }
      );
    }

    // 2) 获取用户信息
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Kirameku-App",
      },
    });
    const userData = await userRes.json();
    if (!userData.id) {
      return NextResponse.json(
        { error: "获取 GitHub 用户信息失败" },
        { status: 400 }
      );
    }

    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || "http://localhost:3000";

    // 后台登录白名单检查
    if (isAdminLogin) {
      const allowedUsers = (process.env.ADMIN_GITHUB_USERS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!allowedUsers.includes(userData.login)) {
        return NextResponse.redirect(
          `${frontendOrigin}/admin/?error=github_unauthorized`
        );
      }

      // 查找或创建 admin 用户
      let user = await prisma.user.findUnique({
        where: { username: userData.login },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: userData.login,
            nickname: userData.login,
            hashed_password: "",
            avatar: userData.avatar_url || "",
            is_admin: true,
          },
        });
      }

      const accessTokenStr = await createToken({
        sub: String(user.id),
        username: user.username,
        type: "user",
      });
      const expires = Date.now() + 72 * 60 * 60 * 1000;

      return NextResponse.redirect(
        `${frontendOrigin}/admin/?token=${accessTokenStr}&expires=${expires}`
      );
    }

    // 3) 查找或创建 GitHubUser（前台登录逻辑不变）
    let githubUser = await prisma.gitHubUser.findUnique({
      where: { github_id: userData.id },
    });

    if (!githubUser) {
      githubUser = await prisma.gitHubUser.create({
        data: {
          github_id: userData.id,
          login: userData.login,
          avatar: userData.avatar_url || "",
          bio: userData.bio || "",
        },
      });
    } else {
      githubUser = await prisma.gitHubUser.update({
        where: { id: githubUser.id },
        data: {
          login: userData.login,
          avatar: userData.avatar_url || "",
          bio: userData.bio || "",
        },
      });
    }

    // 4) 生成 token
    const token = await new SignJWT({
      sub: String(githubUser.id),
      login: githubUser.login,
      type: "github",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("72h")
      .sign(SECRET_KEY);

    // 5) 重定向
    return NextResponse.redirect(
      `${frontendOrigin}/auth/callback?token=${token}`
    );
  } catch {
    return NextResponse.json(
      { error: "GitHub 登录失败" },
      { status: 500 }
    );
  }
}
