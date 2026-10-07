import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function GET(request: Request) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      publishedPosts,
      draftPosts,
      categoriesCount,
      tagsCount,
      commentsCount,
      messagesCount,
      totalVisits,
      uniqueVisitors,
      posts30Days,
      categories,
      browserStats,
      chattersCount,
      musicCount,
      friendLinksCount,
      photosCount,
    ] = await Promise.all([
      prisma.post.count({ where: { status: "published" } }),
      prisma.post.count({ where: { status: "draft" } }),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.comment.count(),
      prisma.message.count(),
      prisma.visitor.count(),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT ip) as count FROM "Visitor"
      `,
      prisma.post.findMany({
        where: {
          status: "published",
          published_at: { gte: thirtyDaysAgo },
        },
        select: { published_at: true },
      }),
      prisma.category.findMany({
        select: { name: true, post_count: true },
        orderBy: { post_count: "desc" },
      }),
      prisma.visitor.groupBy({
        by: ["browser"],
        where: { browser: { not: "" } },
        _count: { browser: true },
      }),
      prisma.chatter.count({ where: { status: "published" } }),
      prisma.music.count(),
      prisma.friendLink.count(),
      prisma.photo.count(),
    ]);

    // 访客趋势：按天统计唯一IP数（去重）
    const visitorTrendRaw = await prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`
      SELECT date(created_at) as date, COUNT(DISTINCT ip) as count
      FROM "Visitor"
      WHERE created_at >= ${thirtyDaysAgo}::timestamp
      GROUP BY date(created_at)
    `;

    const days = getLast30Days();

    const postTrendMap = new Map<string, number>();
    posts30Days.forEach((p) => {
      const d = (p.published_at ?? new Date()).toISOString().slice(0, 10);
      postTrendMap.set(d, (postTrendMap.get(d) || 0) + 1);
    });
    const postTrend = days.map((d) => ({
      date: d,
      count: postTrendMap.get(d) || 0,
    }));

    const visitorTrendMap = new Map<string, number>();
    visitorTrendRaw.forEach((v) => {
      visitorTrendMap.set(v.date, Number(v.count));
    });
    const visitorTrend = days.map((d) => ({
      date: d,
      count: visitorTrendMap.get(d) || 0,
    }));

    const browserDistribution = browserStats.map((b) => ({
      browser: b.browser,
      count: b._count.browser,
    }));

    return NextResponse.json({
      counts: {
        posts: publishedPosts,
        drafts: draftPosts,
        categories: categoriesCount,
        tags: tagsCount,
        comments: commentsCount,
        messages: messagesCount,
        visitors: Number(uniqueVisitors[0]?.count ?? 0),
        totalVisits,
        chatters: chattersCount,
        music: musicCount,
        friendLinks: friendLinksCount,
        photos: photosCount,
      },
      post_trend: postTrend,
      visitor_trend: visitorTrend,
      category_distribution: categories.map((c) => ({
        name: c.name,
        value: c.post_count,
      })),
      browser_distribution: browserDistribution.map((b) => ({
        name: b.browser,
        value: b.count,
      })),
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json(
      { code: 1, message: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
