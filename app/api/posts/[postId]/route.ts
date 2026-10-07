import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { deleteFile, cleanUrlPath, extractR2Urls } from "@/app/lib/r2";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // 优先按 slug 查询（支持纯数字 slug），命中时增加浏览量；
    // 未命中且参数为数字时，再按 ID 查询（编辑/管理场景，不增加浏览量）。
    let post = await prisma.post
      .update({
        where: { slug: postId },
        data: { views: { increment: 1 } },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      })
      .catch(() => null);

    if (!post && /^\d+$/.test(postId)) {
      post = await prisma.post.findUnique({
        where: { id: parseInt(postId, 10) },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      });
    }

    if (!post) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    return NextResponse.json(toPostDetail(post));
  } catch (err) {
    console.error("GET /api/posts/[postId] error:", err);
    return NextResponse.json({ error: "获取文章失败" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await getCurrentUser(req);
    const { postId } = await params;
    const id = parseInt(postId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的文章 ID" }, { status: 400 });
    }

    const existing = await prisma.post.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

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

    const word_count = content !== undefined ? content.length : existing.word_count;
    const reading_time = Math.max(1, Math.floor(word_count / 300));

    let published_at = body.published_at
      ? new Date(body.published_at)
      : existing.published_at;
    if (status === "published" && !published_at) {
      published_at = new Date();
    }

    const oldCategoryId = existing.category_id;
    const newCategoryId = category_id !== undefined ? category_id : oldCategoryId;

    const post = await prisma.$transaction(async (tx) => {
      // 更新文章
      const updated = await tx.post.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          slug: slug !== undefined ? slug : undefined,
          description: description !== undefined ? description : undefined,
          content: content !== undefined ? content : undefined,
          cover: cover !== undefined ? cover : undefined,
          category_id: category_id !== undefined ? category_id || null : undefined,
          status: status !== undefined ? status : undefined,
          is_pinned: is_pinned !== undefined ? is_pinned : undefined,
          word_count,
          reading_time,
          published_at,
        },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
      });

      // 处理 tags 同步
      if (tagNames && Array.isArray(tagNames)) {
        // 删除旧关联
        const oldTagIds = existing.tags.map((pt) => pt.tag_id);
        await tx.postTag.deleteMany({ where: { post_id: id } });

        // 旧 tag post_count 减 1
        for (const tagId of oldTagIds) {
          await tx.tag.update({
            where: { id: tagId },
            data: { post_count: { decrement: 1 } },
          });
        }

        // 创建新关联
        for (const tagName of tagNames) {
          const tagSlug = generateSlug(tagName);
          const tag = await tx.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: { name: tagName, slug: tagSlug },
          });
          await tx.postTag.create({
            data: { post_id: id, tag_id: tag.id },
          });
          await tx.tag.update({
            where: { id: tag.id },
            data: { post_count: { increment: 1 } },
          });
        }

        // 重新加载
        const refreshed = await tx.post.findUnique({
          where: { id },
          include: {
            category: true,
            tags: { include: { tag: true } },
          },
        });
        return refreshed!;
      }

      return updated;
    });

    // 清理 R2：封面变更时删除旧封面；正文移除的图片也删除
    if (cover !== undefined && cover !== existing.cover && existing.cover) {
      await deleteFile(cleanUrlPath(existing.cover)).catch(() => {});
    }
    if (content !== undefined && content !== existing.content) {
      const oldUrls = extractR2Urls(existing.content);
      const newUrls = extractR2Urls(content);
      for (const url of oldUrls) {
        if (!newUrls.includes(url)) {
          await deleteFile(cleanUrlPath(url)).catch(() => {});
        }
      }
    }

    // 更新新旧 category 的 post_count
    if (oldCategoryId !== newCategoryId) {
      if (oldCategoryId) {
        await prisma.category.update({
          where: { id: oldCategoryId },
          data: { post_count: { decrement: 1 } },
        });
      }
      if (newCategoryId) {
        await prisma.category.update({
          where: { id: newCategoryId },
          data: { post_count: { increment: 1 } },
        });
      }
    }

    return NextResponse.json(toPostItem(post));
  } catch (err: any) {
    console.error("PUT /api/posts/[postId] error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新文章失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await getCurrentUser(req);
    const { postId } = await params;
    const id = parseInt(postId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的文章 ID" }, { status: 400 });
    }

    const existing = await prisma.post.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, category: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 删除封面图及正文引用的 R2 图片
    const r2Urls = new Set<string>();
    if (existing.cover) r2Urls.add(existing.cover);
    extractR2Urls(existing.content).forEach((url) => r2Urls.add(url));
    for (const url of r2Urls) {
      await deleteFile(cleanUrlPath(url)).catch(() => {});
    }

    await prisma.$transaction(async (tx) => {
      // 更新 category.post_count
      if (existing.category_id) {
        await tx.category.update({
          where: { id: existing.category_id },
          data: { post_count: { decrement: 1 } },
        });
      }

      // 更新 tag.post_count
      for (const pt of existing.tags) {
        await tx.tag.update({
          where: { id: pt.tag_id },
          data: { post_count: { decrement: 1 } },
        });
      }

      // 删除文章（级联删除 PostTag）
      await tx.post.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/posts/[postId] error:", err);
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除文章失败" }, { status: 500 });
  }
}
