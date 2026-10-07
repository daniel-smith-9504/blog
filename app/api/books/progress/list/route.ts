import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") || "";
    const bookIds = idsParam.split(",").map((id) => parseInt(id)).filter((id) => !isNaN(id));

    if (bookIds.length === 0) {
      return NextResponse.json({ progresses: [] });
    }

    const progresses = await prisma.readingProgress.findMany({
      where: { book_id: { in: bookIds } },
    });

    return NextResponse.json({ progresses });
  } catch (err) {
    console.error("List progress error:", err);
    return NextResponse.json({ error: "获取阅读进度失败" }, { status: 500 });
  }
}
