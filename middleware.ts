import { NextRequest, NextResponse } from "next/server";
import { getDbSiteConfig } from "@/app/lib/site-config-db";
import { siteConfig } from "@/siteConfig";

export async function middleware(request: NextRequest) {
  // 只处理对 HTML 文档的请求（排除静态资源和 API）
  const accept = request.headers.get("accept") || "";
  const isHtmlRequest = accept.includes("text/html");
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (!isHtmlRequest || isApiRequest) {
    return NextResponse.next();
  }

  try {
    const dbConfig = await getDbSiteConfig();
    const requestHeaders = new Headers(request.headers);

    const title = dbConfig.title || siteConfig.title;
    const bio = dbConfig.bio || siteConfig.bio;
    const authorName = dbConfig.authorName || siteConfig.authorName;
    const avatarUrl = dbConfig.avatarUrl || siteConfig.avatarUrl;

    requestHeaders.set("x-site-title", title);
    requestHeaders.set("x-site-bio", bio);
    requestHeaders.set("x-site-author", authorName);
    requestHeaders.set("x-site-avatar", avatarUrl);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (Next.js 静态文件，已有缓存策略)
     * - _next/image (Next.js 图片优化)
     * - favicon.ico
     * - live2d 资源（文件较大，由 CDN 处理）
     */
    "/((?!_next/static|_next/image|favicon.ico|live2d).*)",
  ],
};