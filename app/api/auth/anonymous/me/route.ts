import { NextResponse } from "next/server";
import { decodeToken } from "@/app/lib/auth";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const token = auth.slice(7);
    const payload = await decodeToken(token);

    if (payload.type !== "anonymous") {
      return NextResponse.json({ error: "无效的令牌" }, { status: 401 });
    }

    return NextResponse.json({
      login: payload.sub as string,
      avatar: payload.avatar as string,
    });
  } catch {
    return NextResponse.json({ error: "令牌无效或已过期" }, { status: 401 });
  }
}