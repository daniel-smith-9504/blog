import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { getPresignedUploadUrl, generateFileName } from "@/app/lib/r2";

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);
    const body = await request.json();
    const { filename, contentType, prefix = "uploads" } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "缺少文件名或内容类型" },
        { status: 400 }
      );
    }

    const ext = filename.split(".").pop() || "bin";
    const safeName = generateFileName(ext);
    const key = `${prefix}/${safeName}`;
    const url = await getPresignedUploadUrl(key, contentType, 300);

    return NextResponse.json({ url, key });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Presigned URL error:", err);
    return NextResponse.json(
      { error: "生成上传链接失败: " + (err?.message || "未知错误") },
      { status: 500 }
    );
  }
}
