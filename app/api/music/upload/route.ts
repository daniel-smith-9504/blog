import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { uploadFile, getFile, getFileUrl, cleanUrlPath, generateFileName } from "@/app/lib/r2";
import * as mm from "music-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".flac", ".mp4", ".m4a", ".aac", ".ogg", ".oga"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/** 文件扩展名 -> Content-Type / mime 推断 */
function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "mp3":  return "audio/mpeg";
    case "wav":  return "audio/wav";
    case "flac": return "audio/flac";
    case "mp4":  return "audio/mp4";
    case "m4a":  return "audio/mp4";
    case "aac":  return "audio/aac";
    case "ogg":
    case "oga":  return "audio/ogg";
    default:     return "audio/mpeg";
  }
}

/** 是否允许的音频扩展名 */
function isAllowedExt(name: string): string | null {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.find((e) => lower.endsWith(e)) || null;
}

/** 从多来源提取歌词：music-metadata common.lyrics / native tags / comment 字段 */
function pickLyrics(common: mm.ICommonTagsResult, native: mm.INativeTagDict): string {
  // 1) music-metadata 已经把 USLT(MP3)、SYLT(MP3)、LYRICS(FLAC/OGG)、©lyr(MP4)
  //    等统一收集到 common.lyrics（ILyricsTag[]）。这是最稳的来源。
  if (common.lyrics && common.lyrics.length > 0) {
    for (const l of common.lyrics) {
      const text = l?.text;
      if (text && text.trim()) return text;
    }
  }

  // 2) 再翻一遍 native tags 兜底（不同版本/不同容器可能只暴露在 native 里）
  const lyricTagIds = new Set([
    "USLT", "SYLT",                  // ID3v2
    "LYRICS", "lyrics",              // Vorbis (FLAC/OGG)
    "©lyr", "©LYR",                  // MP4/M4A iTunes atom
    "WM/Lyrics",                     // WMA/ASF
    "\u0000LYR",                     // 一些工具写出的带空格的 ID3
  ]);
  for (const tagList of Object.values(native || {})) {
    for (const tag of tagList as any[]) {
      const id = String(tag?.id || "").trim();
      if (!lyricTagIds.has(id)) continue;
      const val: any = tag.value;
      if (typeof val === "string" && val.trim()) return val.trim();
      if (val && typeof val === "object") {
        if (typeof val.text === "string" && val.text.trim()) return val.text.trim();
        if (Array.isArray(val)) {
          // SYLT 同步歌词：[{ text, timeStamp }]
          const tsv = val
            .map((entry: any) => {
              const text = entry?.text || "";
              if (typeof entry?.timeStamp === "number") {
                const ms = entry.timeStamp;
                const m = Math.floor(ms / 60000);
                const s = Math.floor((ms % 60000) / 1000);
                const cs = Math.floor((ms % 1000) / 10);
                return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}]${text}`;
              }
              return text;
            })
            .filter(Boolean)
            .join("\n");
          if (tsv.trim()) return tsv;
        }
      }
    }
  }

  // 3) 一些压缩/转码工具把 LRC 整段塞到 comment / description
  const lookalike = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v)) {
      const joined = v.map((x) => (typeof x === "string" ? x : x?.text || "")).join("\n");
      return joined || null;
    }
    return null;
  };
  for (const c of common.comment || []) {
    const txt = lookalike(c);
    if (txt && /\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/.test(txt)) return txt;
  }

  return "";
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, "_").slice(0, 100);
}

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
    const artist = (formData.get("artist") as string) || "";
    const coverFile = formData.get("cover") as File | null;
    const lrcFile = formData.get("lrc") as File | null;
    const sort = formData.get("sort") ? parseInt(formData.get("sort") as string) : 0;

    let musicUrl = "";
    let fileName = "";
    let buffer: Buffer;
    let fileType = "";

    if (typeof fileField === "string") {
      // 客户端已直传到 R2，传入的是 URL
      const key = cleanUrlPath(fileField);
      musicUrl = getFileUrl(key);
      fileName = decodeURIComponent(key.split("/").pop() || "");
      const fileBuffer = await getFile(key);
      if (!fileBuffer) {
        return NextResponse.json({ error: "无法从 R2 读取音频文件" }, { status: 400 });
      }
      buffer = fileBuffer;
      fileType = mimeFromName(fileName);
    } else if (fileField instanceof File) {
      const file = fileField;
      fileName = file.name;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "文件大小超过 50MB 限制" }, { status: 400 });
      }
      const ext = isAllowedExt(fileName);
      if (!ext) {
        return NextResponse.json(
          { error: `不支持的文件格式，仅支持 ${ALLOWED_EXTENSIONS.join(" / ")}` },
          { status: 400 }
        );
      }
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      fileType = file.type || mimeFromName(fileName);
      const safeName = generateFileName(ext.replace(".", ""));
      const musicKey = `uploads/music/${safeName}`;
      musicUrl = await uploadFile(musicKey, bytes, fileType);
    } else {
      return NextResponse.json({ error: "缺少音频文件" }, { status: 400 });
    }

    // 提取音频元数据
    let finalTitle = title;
    let finalArtist = artist;
    let coverUrl = "";
    let lrcText = "";

    try {
      const metadata = await mm.parseBuffer(buffer, { mimeType: fileType });
      const common = metadata.common;

      if (!finalTitle && common.title) finalTitle = common.title;
      if (!finalArtist) {
        finalArtist = common.artist || common.artists?.join(", ") || "";
      }

      // 提取内嵌封面
      if (common.picture && common.picture.length > 0 && !coverFile) {
        const pic = common.picture[0];
        const picExt = pic.format?.split("/").pop() || "jpg";
        const picName = generateFileName(picExt);
        const picKey = `uploads/${picName}`;
        coverUrl = await uploadFile(picKey, new Uint8Array(pic.data).buffer as ArrayBuffer, pic.format || "image/jpeg");
      }

      // 提取内嵌歌词：USLT(MP3) / SYLT(MP3) / LYRICS(FLAC/OGG) / ©lyr(MP4) / WM/Lyrics(WMA)
      lrcText = pickLyrics(common, metadata.native || {});
    } catch (e) {
      console.error("Metadata parse error:", e);
    }

    // 手动上传的封面优先
    if (coverFile) {
      const coverExt = coverFile.name.split(".").pop() || "jpg";
      const coverName = generateFileName(coverExt);
      const coverKey = `uploads/${coverName}`;
      const coverBytes = await coverFile.arrayBuffer();
      coverUrl = await uploadFile(coverKey, coverBytes, coverFile.type);
    }

    // 手动上传的歌词文件优先于内嵌歌词
    let lrcSrc = "";
    if (lrcFile) {
      const lrcExt = lrcFile.name.split(".").pop() || "lrc";
      const lrcName = generateFileName(lrcExt);
      const lrcKey = `uploads/music/${lrcName}`;
      const lrcBytes = await lrcFile.arrayBuffer();
      lrcSrc = await uploadFile(lrcKey, lrcBytes, "text/plain");
      lrcText = new TextDecoder().decode(lrcBytes);
    }

    const music = await prisma.music.create({
      data: {
        title: finalTitle || fileName.replace(/\.[^.]+$/, ""),
        artist: finalArtist,
        cover: coverUrl,
        src: musicUrl,
        lrc: lrcText,
        lrcSrc: lrcSrc,
        type: "local",
        sort,
      },
    });

    return NextResponse.json({ success: true, music });
  } catch (err: any) {
    if (err.message === "未登录" || err.message === "无效的令牌") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Music upload error:", err);
    return NextResponse.json({ error: "上传失败: " + (err.message || "未知错误") }, { status: 500 });
  }
}