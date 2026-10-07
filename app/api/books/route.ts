import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("category_id")
      ? parseInt(searchParams.get("category_id")!)
      : null;
    const format = searchParams.get("format") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "20");

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { author: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (format) {
      where.format = format;
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: { category: true },
        orderBy: { sort: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.book.count({ where }),
    ]);

    const [categories] = await Promise.all([
      prisma.bookCategory.findMany({
        orderBy: { sort: "asc" },
        include: { _count: { select: { books: true } } },
      }),
    ]);

    return NextResponse.json({
      books,
      categories,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("Books API error:", err);
    return NextResponse.json({ error: "获取图书列表失败" }, { status: 500 });
  }
}