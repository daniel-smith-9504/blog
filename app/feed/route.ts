import { NextResponse } from "next/server";
import { siteConfig } from "@/siteConfig";
import { marked } from "marked";
import { prisma } from "@/app/lib/prisma";
import { getDbSiteConfig } from "@/app/lib/site-config-db";

export const revalidate = 3600;

export async function GET() {
  try {
    const dbConfig = await getDbSiteConfig().catch(() => ({} as Record<string, string>));
    const title = dbConfig.title || siteConfig.title;
    const url = dbConfig.url || siteConfig.url;
    const bio = dbConfig.bio || siteConfig.bio;
    const authorName = dbConfig.authorName || siteConfig.authorName;
    const feedAuthor = `guh982719@gmail.com (${authorName})`;

    const posts = await prisma.post.findMany({
      where: { status: "published" },
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      take: 10,
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    const items = (
      await Promise.all(
        posts.map((post) => generateItem(post, url, feedAuthor))
      )
    ).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${url}</link>
    <description>${escapeXml(bio)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${url}/feed" rel="self" type="application/rss+xml"/>
    <generator>Next.js</generator>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("RSS generation failed:", error);
    return new NextResponse("Failed to generate RSS feed", { status: 500 });
  }
}

async function generateItem(post: any, siteUrl: string, feedAuthor: string): Promise<string> {
  const postUrl = `${siteUrl}/posts/${post.slug}`;
  const pubDate = post.published_at
    ? new Date(post.published_at).toUTCString()
    : new Date(post.created_at).toUTCString();

  const tags = post.tags || [];
  const categories = tags
    .map((pt: any) => `      <category>${escapeXml(pt.tag.name)}</category>`)
    .join("\n");

  let contentHtml = "";
  if (post.content) {
    try {
      contentHtml = await marked.parse(post.content);
    } catch {
      contentHtml = escapeXml(post.content);
    }
  }

  return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.description || ""}]]></description>
      <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(feedAuthor)}</author>${categories ? `\n${categories}` : ""}
    </item>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
