import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { uploadFile, deleteFile, cleanUrlPath, generateFileName } from "@/app/lib/r2";

// 强制动态渲染，避免缓存导致上传失败
export const dynamic = "force-dynamic";

function ensureR2PublicUrl(): void {
  if (!process.env.R2_PUBLIC_URL) {
    throw new Error(
      "R2_PUBLIC_URL 未配置。请为 Cloudflare R2 存储桶设置自定义域（Public URL），否则上传的图片无法在前台公开访问。"
    );
  }
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const ALLOWED_EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. 鉴权
    let userId: number;
    try {
      const payload = await getCurrentUser(request);
      userId = parseInt(payload.sub as string);
      if (isNaN(userId)) {
        return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
      }
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.message || "未登录或登录已过期" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    // 2. 获取文件
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "缺少上传文件" }, { status: 400 });
    }

    // 3. 校验文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型 "${file.type}"，仅支持 JPG、PNG、WebP、GIF、SVG` },
        { status: 400 }
      );
    }

    // 4. 校验文件大小
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json(
        { error: `文件大小 ${sizeMB}MB 超过 10MB 限制` },
        { status: 400 }
      );
    }

    // 5. 校验 R2 配置
    try {
      ensureR2PublicUrl();
    } catch (r2Err: any) {
      console.error("R2 配置错误:", r2Err.message);
      return NextResponse.json(
        { error: "存储服务未配置：" + r2Err.message },
        { status: 500 }
      );
    }

    // 6. 生成文件名并上传
    const ext = ALLOWED_EXT_MAP[file.type] || file.type.split("/")[1];
    const filename = generateFileName(ext);
    const key = `uploads/${filename}`;

    const buffer = await file.arrayBuffer();

    try {
      const imageUrl = await uploadFile(key, buffer, file.type);

      // 简易方向检测（默认 landscape）
      const orientation = "landscape";

      return NextResponse.json({
        url: imageUrl,
        orientation,
      });
    } catch (uploadErr: any) {
      console.error("R2 上传失败:", uploadErr);
      return NextResponse.json(
        { error: "图片上传失败（存储服务错误）：" + (uploadErr.message || "未知错误") },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Upload image error:", err);
    return NextResponse.json(
      { error: "上传失败：" + (err?.message || "未知错误") },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let userId: number;
    try {
      const payload = await getCurrentUser(request);
      userId = parseInt(payload.sub as string);
      if (isNaN(userId)) {
        return NextResponse.json({ error: "未登录或登录已过期" }, { status: 401 });
      }
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.message || "未登录或登录已过期" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
    }

    const key = cleanUrlPath(url);
    if (key.includes("..") || key.includes("\\")) {
      return NextResponse.json({ error: "非法文件名" }, { status: 400 });
    }

    try {
      await deleteFile(key);
      return NextResponse.json({ code: 0, message: "删除成功" });
    } catch (delErr: any) {
      console.error("R2 删除失败:", delErr);
      return NextResponse.json(
        { error: "删除失败（存储服务错误）：" + (delErr.message || "未知错误") },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Delete image error:", err);
    return NextResponse.json(
      { error: "删除失败：" + (err?.message || "未知错误") },
      { status: 500 }
    );
  }
}
