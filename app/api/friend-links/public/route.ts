import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 前台用户申请友链（公开接口，无需登录）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.url) {
      return NextResponse.json(
        { code: 1, message: "名称和链接不能为空" },
        { status: 400 }
      );
    }
    const link = await prisma.friendLink.create({
      data: {
        name: body.name,
        url: body.url,
        avatar: body.avatar || "",
        description: body.description || "",
        sort: body.sort || 0,
        is_approved: false, // 前台提交默认待审核
      },
    });
    return NextResponse.json({
      code: 0,
      message: "友链申请已提交，审核通过后将在前台展示",
      data: link,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}