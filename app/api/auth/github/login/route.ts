import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state") || "";
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub Client ID 未配置" },
      { status: 500 }
    );
  }
  const redirectUri = `${process.env.FRONTEND_ORIGIN || "https://example.com"}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${encodeURIComponent(state)}`;
  return NextResponse.redirect(url);
}
