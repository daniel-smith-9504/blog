import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

    const [list, total] = await Promise.all([
      prisma.loginLog.findMany({
        where: { user_id: user.id },
        orderBy: { operatingTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.loginLog.count({ where: { user_id: user.id } }),
    ]);

    return NextResponse.json({
      code: 0,
      message: "success",
      data: {
        list,
        total,
        pageSize,
        currentPage: page,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取日志失败";
    return NextResponse.json({ code: 1, message }, { status: 401 });
  }
}
