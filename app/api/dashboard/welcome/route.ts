import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

/**
 * 后台首页 / 欢迎页统计接口
 * 返回四个核心卡片 + 趋势图数据，全部从真实数据库中统计
 *
 * 映射关系：
 *   访客数 -> 访客数(独立 IP)
 *   评论数 -> 评论数(comment)
 *   文章数 -> 已发布文章数(post status=published)
 *   总浏览量 -> post.views 总和
 */
export async function GET(request: Request) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const [
      visitorCount,
      commentCount,
      publishedPostCount,
      messageCount,
      totalPostViews,
    ] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT ip) as count FROM "Visitor"
      `,
      prisma.comment.count(),
      prisma.post.count({ where: { status: "published" } }),
      prisma.message.count(),
      prisma.post.aggregate({
        _sum: { views: true },
        where: { status: "published" },
      }),
    ]);

    // 过去 14 天的访客/评论/文章趋势（用于上周 vs 本周对比）
    const now = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [
      visitorDaily,
      commentDaily,
      postDaily,
    ] = await Promise.all([
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT date(created_at) as date, COUNT(DISTINCT ip) as count
        FROM "Visitor"
        WHERE created_at >= ${fourteenDaysAgo}::timestamp
        GROUP BY date(created_at)
      `,
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT date(created_at) as date, COUNT(*) as count
        FROM "Comment"
        WHERE created_at >= ${fourteenDaysAgo}::timestamp
        GROUP BY date(created_at)
      `,
      prisma.post.findMany({
        where: {
          status: "published",
          published_at: { gte: fourteenDaysAgo },
        },
        select: { published_at: true },
      }),
    ]);

    // 生成最近 14 天的日期数组
    const days14: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days14.push(d.toISOString().slice(0, 10));
    }

    const fillDays = (
      raw: Array<{ date: string | Date; count: bigint | number }>
    ) =>
      days14.map((d) => {
        const hit = raw.find((r) => {
          const rawDate =
            typeof r.date === "string"
              ? r.date.slice(0, 10)
              : r.date.toISOString().slice(0, 10);
          return rawDate === d;
        });
        return hit ? Number(hit.count) : 0;
      });

    const allVisitorSeries = fillDays(visitorDaily);
    const allCommentSeries = fillDays(commentDaily);

    const postMap = new Map<string, number>();
    postDaily.forEach((p) => {
      const d = (p.published_at ?? new Date()).toISOString().slice(0, 10);
      postMap.set(d, (postMap.get(d) || 0) + 1);
    });
    const allPostSeries = days14.map((d) => postMap.get(d) || 0);

    // 拆分为上周(0-6)和本周(7-13)
    const lastWeekVisitor = allVisitorSeries.slice(0, 7);
    const thisWeekVisitor = allVisitorSeries.slice(7, 14);
    const lastWeekComment = allCommentSeries.slice(0, 7);
    const thisWeekComment = allCommentSeries.slice(7, 14);

    // 用于四张卡片显示本周数据
    const visitorSeries = thisWeekVisitor;
    const commentSeries = thisWeekComment;
    const postSeries = allPostSeries.slice(7, 14);

    // 用户总浏览量
    const totalViews = Number(totalPostViews._sum.views ?? 0);

    return NextResponse.json({
      // 四个核心卡片
      chartData: [
        {
          name: "访客数",
          value: Number(visitorCount[0]?.count ?? 0),
          data: visitorSeries,
        },
        {
          name: "评论数",
          value: commentCount,
          data: commentSeries,
        },
        {
          name: "文章数",
          value: publishedPostCount,
          data: postSeries,
        },
        {
          name: "总浏览量",
          value: totalViews,
          data: totalViews > 0 ? postSeries : [],
        },
      ],
      // 概览条形图：上周 vs 本周
      barChartData: [
        {
          requireData: lastWeekVisitor,
          questionData: lastWeekComment,
        },
        {
          requireData: thisWeekVisitor,
          questionData: thisWeekComment,
        },
      ],
      // 最新动态：取最近发布的文章/说说
      latestNewsData: await getLatestNews(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    console.error("Welcome stats error:", err);
    return NextResponse.json(
      { code: 1, message },
      { status: 500 }
    );
  }
}

async function getLatestNews() {
  const [posts, chatters] = await Promise.all([
    prisma.post.findMany({
      where: { status: "published" },
      orderBy: { published_at: "desc" },
      take: 5,
      select: { title: true, published_at: true },
    }),
    prisma.chatter.findMany({
      where: { status: "published" },
      orderBy: { created_at: "desc" },
      take: 5,
      select: { id: true, content: true, created_at: true },
    }),
  ]);

  const merged = [
    ...posts.map((p) => ({
      date: p.published_at?.toISOString() ?? new Date().toISOString(),
      requiredNumber: 1,
      resolveNumber: 1,
      type: "post" as const,
      title: p.title,
    })),
    ...chatters.map((c) => ({
      date: c.created_at.toISOString(),
      requiredNumber: 1,
      resolveNumber: 0,
      type: "chatter" as const,
      title: c.content.slice(0, 30),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return merged;
}
