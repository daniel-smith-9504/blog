import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await getCurrentUser(request);

    const siteConfigs = [
      { key: "title", value: "My Blog", description: "网站标题" },
      { key: "url", value: "https://example.com/", description: "网站地址" },
      { key: "authorName", value: "Admin", description: "作者名" },
      { key: "bio", value: "欢迎来到我的博客", description: "个人简介" },
      { key: "avatarUrl", value: "https://files-blog-sure.20130825.xyz/icon.jpg", description: "头像图片地址" },
      { key: "useGradient", value: "false", description: "是否使用渐变背景" },
      { key: "themeColors", value: JSON.stringify(["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"]), description: "主题颜色数组" },
      { key: "bgImages", value: "[]", description: "背景图片地址数组（JSON）" },
      { key: "defaultPostCover", value: "", description: "文章默认封面图（空则使用默认）" },
      { key: "photoWallImage", value: "", description: "照片墙预览图（空则使用默认）" },
      { key: "cloudMusicPlaylistId", value: "", description: "网易云音乐歌单ID" },
      { key: "cloudMusicIds", value: "[]", description: "网易云音乐歌曲ID数组（JSON）" },
      { key: "apiBaseUrl", value: "", description: "后端API地址（空则使用当前域名）" },
      { key: "social_github", value: "", description: "GitHub链接" },
      { key: "social_bilibili", value: "", description: "Bilibili链接" },
      { key: "social_email", value: "", description: "邮箱地址" },
      { key: "social_x", value: "", description: "X(Twitter)链接" },
      { key: "social_youtube", value: "", description: "YouTube链接" },
      { key: "icp_name", value: "", description: "ICP备案号" },
      { key: "icp_link", value: "", description: "ICP备案链接" },
      { key: "moeIcp_name", value: "", description: "萌ICP备案号" },
      { key: "moeIcp_link", value: "", description: "萌ICP备案链接" },
      { key: "chatterTitle", value: "留言", description: "说说/留言页面标题" },
      { key: "chatterDescription", value: "生活、技术、随想的碎片记录", description: "说说/留言页面描述" },
    ];

    let created = 0;
    let skipped = 0;
    for (const cfg of siteConfigs) {
      const existing = await prisma.siteConfig.findUnique({ where: { key: cfg.key } });
      if (existing) {
        skipped++;
      } else {
        await prisma.siteConfig.create({ data: cfg });
        created++;
      }
    }

    return NextResponse.json({
      code: 0,
      message: "站点配置初始化完成",
      created,
      skipped,
    });
  } catch (err: any) {
    console.error("Init config error:", err);
    return NextResponse.json(
      { code: 1, message: err?.message || "初始化失败" },
      { status: err?.message === "未登录" || err?.message === "无效的令牌" ? 401 : 500 }
    );
  }
}