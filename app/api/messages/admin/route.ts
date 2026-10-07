import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: Request) {
  try {
    await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    const where = status ? { status } : {};

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { ...where, parent_id: null },
        include: {
          githubUser: true,
          replies: {
            include: {
              githubUser: true,
              replies: {
                include: {
                  githubUser: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json(messages);
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "获取留言列表失败" }, { status: 500 });
  }
}
