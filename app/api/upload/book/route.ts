import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { uploadFile, getFile, getFileUrl, cleanUrlPath, generateFileName } from "@/app/lib/r2";
import { parseEpubMeta, parseEpubChapters } from "@/app/lib/epub-parser";

const ALLOWED_TYPES = [
  "application/epub+zip",
  "application/pdf",
  "text/plain",
  "application/x-mobipocket-ebook",
  "application/octet-stream",
];
const ALLOWED_EXTENSIONS = [".epub", ".pdf", ".txt", ".mobi"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser(request);
    const userId = parseInt(payload.sub as string);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const formData = await request.formData();
    const fileField = formData.get("file");
    const title = (formData.get("title") as string) || "";
    const author = (formData.get("author") as string) || "";
    const description = (formData.get("description") as string) || "";
    const categoryId = formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null;
    const coverFile = formData.get("cover") as File | null;

    if (!title) {
      return NextResponse.json({ error: "缺少书名" }, { status: 400 });
    }

    let bookUrl = "";
    let fileName = "";
    let buffer: Buffer;
    let fileSize = 0;
    let fileType = "";
    let format = "";

    if (typeof fileField === "string") {
      // 客户端已直传到 R2，传入的是 URL
      const key = cleanUrlPath(fileField);
      bookUrl = getFileUrl(key);
      fileName = decodeURIComponent(key.split("/").pop() || "");
      const fileBuffer = await getFile(key);
      if (!fileBuffer) {
        return NextResponse.json({ error: "无法从 R2 读取图书文件" }, { status: 400 });
      }
      buffer = fileBuffer;
      fileSize = buffer.length;
      fileType = "application/octet-stream";
      const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
      format = extMatch ? extMatch[1].toLowerCase() : "";
    } else if (fileField instanceof File) {
      const file = fileField;
      fileName = file.name;
      fileSize = file.size;
      fileType = file.type || "application/octet-stream";
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "文件大小超过 50MB 限制" }, { status: 400 });
      }
      const ext = ALLOWED_EXTENSIONS.find((e) => fileName.toLowerCase().endsWith(e));
      if (!ext) {
        return NextResponse.json({ error: "不支持的文件格式，仅支持 EPUB、PDF、TXT、MOBI" }, { status: 400 });
      }
      format = ext.replace(".", "");
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      const safeName = generateFileName(format);
      const bookKey = `uploads/books/${safeName}`;
      bookUrl = await uploadFile(bookKey, bytes, fileType);
    } else {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    let finalTitle = title;
    let finalAuthor = author;
    let finalDescription = description;
    let coverUrl = "";

    // 自动解析 EPUB 元数据
    if (format === "epub") {
      try {
        const meta = await parseEpubMeta(buffer);
        if (!finalTitle && meta.title) finalTitle = meta.title;
        if (!finalAuthor && meta.author) finalAuthor = meta.author;
        if (!finalDescription && meta.description) finalDescription = meta.description;
        if (!finalDescription && meta.excerpt) finalDescription = meta.excerpt;

        if (!coverFile && meta.coverBuffer) {
          const coverName = generateFileName(meta.coverExt || "jpg");
          const coverKey = `uploads/${coverName}`;
          coverUrl = await uploadFile(coverKey, new Uint8Array(meta.coverBuffer).buffer as ArrayBuffer, "image/" + (meta.coverExt || "jpeg"));
        }
      } catch (e) {
        console.error("EPUB parse error:", e);
      }
    }

    // 手动上传的封面优先
    if (coverFile) {
      const coverExt = coverFile.name.split(".").pop() || "jpg";
      const coverName = generateFileName(coverExt);
      const coverKey = `uploads/${coverName}`;
      const coverBytes = await coverFile.arrayBuffer();
      coverUrl = await uploadFile(coverKey, coverBytes, coverFile.type);
    }

    const book = await prisma.book.create({
      data: {
        title: finalTitle || fileName.replace(new RegExp("\\.?" + format + "$", "i"), ""),
        author: finalAuthor,
        description: finalDescription,
        cover: coverUrl,
        file_url: bookUrl,
        format,
        file_size: fileSize,
        category_id: categoryId,
      },
    });

    // 解析并存储章节
    if (format === "epub") {
      try {
        const chapters = await parseEpubChapters(buffer);
        if (chapters.length > 0) {
          await prisma.bookChapter.createMany({
            data: chapters.map((ch, i) => ({
              book_id: book.id,
              title: ch.title,
              href: ch.href,
              order: i,
            })),
          });
          await prisma.book.update({
            where: { id: book.id },
            data: { chapter_count: chapters.length },
          });
        }
      } catch (e) {
        console.error("EPUB chapter parse error:", e);
      }
    }

    return NextResponse.json({ success: true, book });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Book upload error:", err);
    return NextResponse.json({ error: "上传失败: " + (err?.message || "未知错误") }, { status: 500 });
  }
}