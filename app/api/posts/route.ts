import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

function toPostItem(post: any) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.description,
    cover: post.cover,
    category: post.category?.name || "",
    tags: post.tags?.map((pt: any) => pt.tag.name) || [],
    status: post.status,
    is_pinned: post.is_pinned,
    views: post.views,
    likes: post.likes,
    word_count: post.word_count,
    reading_time: post.reading_time,
    published_at: post.published_at ? post.published_at.toISOString() : null,
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
  };
}

function toPostDetail(post: any) {
  return {
    ...toPostItem(post),
    content: post.content,
  };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, "")
    .substring(0, 50);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const categorySlug = searchParams.get("category") || undefined;
    const tagSlug = searchParams.get("tag") || undefined;
    const keyword = searchParams.get("keyword") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const size = Math.max(1, parseInt(searchParams.get("size") || "10", 10));

    let categoryId: number | undefined;
    if (categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug },
      });
      if (cat) categoryId = cat.id;
    }

    let tagId: number | undefined;
    if (tagSlug) {
      const tag = await prisma.tag.findUnique({
        where: { slug: tagSlug },
      });
      if (tag) tagId = tag.id;
    }

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.category_id = categoryId;
    if (tagId) {
      where.tags = { some: { tag_id: tagId } };
    }
    if (keyword?.trim()) {
      const k = keyword.trim();
      where.OR = [
        { title: { contains: k } },
        { description: { contains: k } },
        { content: { contains: k } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      skip: (page - 1) * size,
      take: size,
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(posts.map(toPostItem));
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const {
      title,
      slug,
      description,
      content,
      cover,
      category_id,
      status,
      is_pinned,
      tags: tagNames,
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "标题和 slug 不能为空" },
        { status: 400 }
      );
    }

    const word_count = (content || "").length;
    const reading_time = Math.max(1, Math.floor(word_count / 300));

    let published_at = body.published_at ? new Date(body.published_at) : null;
    if (status === "published" && !published_at) {
      published_at = new Date();
    }

    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          title,
          slug,
          description: description || "",
          content: content || "",
          cover: cover || "",
          category_id: category_id || null,
          status: status || "draft",
          is_pinned: is_pinned || false,
          word_count,
          reading_time,
          published_at,
        },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      });

      // 处理 tags
      if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
        for (const tagName of tagNames) {
          const tagSlug = generateSlug(tagName);
          const tag = await tx.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: { name: tagName, slug: tagSlug },
          });
          await tx.postTag.create({
            data: { post_id: newPost.id, tag_id: tag.id },
          });
          await tx.tag.update({
            where: { id: tag.id },
            data: { post_count: { increment: 1 } },
          });
        }
        // 重新加载 tags
        const refreshed = await tx.post.findUnique({
          where: { id: newPost.id },
          include: {
            category: true,
            tags: { include: { tag: true } },
          },
        });
        return refreshed!;
      }

      return newPost;
    });

    // 更新 category.post_count
    if (category_id) {
      await prisma.category.update({
        where: { id: category_id },
        data: { post_count: { increment: 1 } },
      });
    }

    return NextResponse.json(toPostItem(post));
  } catch (err: any) {
    console.error("POST /api/posts error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "创建文章失败" }, { status: 500 });
  }
}
