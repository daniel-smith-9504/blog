import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { getFileUrl, cleanUrlPath } from "@/app/lib/r2";

async function doFix(request: NextRequest) {
  await getCurrentUser(request);

  const results: Record<string, number> = {};

  // 1. 修复 Photo.url
  const photos = await prisma.photo.findMany();
  let photoFixed = 0;
  for (const photo of photos) {
    if (photo.url.includes("r2.cloudflarestorage.com") && !photo.url.includes("r2.dev")) {
      const key = cleanUrlPath(photo.url);
      const newUrl = getFileUrl(key);
      await prisma.photo.update({ where: { id: photo.id }, data: { url: newUrl } });
      photoFixed++;
    }
  }
  results["photo"] = photoFixed;

    // 2. 修复 Album.cover
    const albums = await prisma.album.findMany();
    let albumFixed = 0;
    for (const album of albums) {
      if (album.cover.includes("r2.cloudflarestorage.com") && !album.cover.includes("r2.dev")) {
        const key = cleanUrlPath(album.cover);
        const newUrl = getFileUrl(key);
        await prisma.album.update({ where: { id: album.id }, data: { cover: newUrl } });
        albumFixed++;
      }
    }
    results["album"] = albumFixed;

    // 3. 修复 Music.cover / Music.src
    const musics = await prisma.music.findMany();
    let musicFixed = 0;
    for (const music of musics) {
      const updates: Record<string, string> = {};
      if (music.cover.includes("r2.cloudflarestorage.com") && !music.cover.includes("r2.dev")) {
        updates.cover = getFileUrl(cleanUrlPath(music.cover));
      }
      if (music.src.includes("r2.cloudflarestorage.com") && !music.src.includes("r2.dev")) {
        updates.src = getFileUrl(cleanUrlPath(music.src));
      }
      if (Object.keys(updates).length > 0) {
        await prisma.music.update({ where: { id: music.id }, data: updates });
        musicFixed++;
      }
    }
    results["music"] = musicFixed;

    // 4. 修复 Post.cover
    const posts = await prisma.post.findMany();
    let postFixed = 0;
    for (const post of posts) {
      if (post.cover.includes("r2.cloudflarestorage.com") && !post.cover.includes("r2.dev")) {
        const key = cleanUrlPath(post.cover);
        const newUrl = getFileUrl(key);
        await prisma.post.update({ where: { id: post.id }, data: { cover: newUrl } });
        postFixed++;
      }
    }
    results["post"] = postFixed;

    // 5. 修复 Project.cover_image
    const projects = await prisma.project.findMany();
    let projectFixed = 0;
    for (const project of projects) {
      if (project.cover_image.includes("r2.cloudflarestorage.com") && !project.cover_image.includes("r2.dev")) {
        const key = cleanUrlPath(project.cover_image);
        const newUrl = getFileUrl(key);
        await prisma.project.update({ where: { id: project.id }, data: { cover_image: newUrl } });
        projectFixed++;
      }
    }
    results["project"] = projectFixed;

    // 6. 修复 FriendLink.avatar
    const friends = await prisma.friendLink.findMany();
    let friendFixed = 0;
    for (const friend of friends) {
      if (friend.avatar.includes("r2.cloudflarestorage.com") && !friend.avatar.includes("r2.dev")) {
        const key = cleanUrlPath(friend.avatar);
        const newUrl = getFileUrl(key);
        await prisma.friendLink.update({ where: { id: friend.id }, data: { avatar: newUrl } });
        friendFixed++;
      }
    }
    results["friendLink"] = friendFixed;

    // 7. 修复 User.avatar
    const users = await prisma.user.findMany();
    let userFixed = 0;
    for (const user of users) {
      if (user.avatar.includes("r2.cloudflarestorage.com") && !user.avatar.includes("r2.dev")) {
        const key = cleanUrlPath(user.avatar);
        const newUrl = getFileUrl(key);
        await prisma.user.update({ where: { id: user.id }, data: { avatar: newUrl } });
        userFixed++;
      }
    }
    results["user"] = userFixed;

    // 8. 修复 Chatter.images (JSON 数组)
    const chatters = await prisma.chatter.findMany();
    let chatterFixed = 0;
    for (const chatter of chatters) {
      try {
        const images: string[] = JSON.parse(chatter.images || "[]");
        let changed = false;
        const newImages = images.map((url: string) => {
          if (url.includes("r2.cloudflarestorage.com") && !url.includes("r2.dev")) {
            changed = true;
            return getFileUrl(cleanUrlPath(url));
          }
          return url;
        });
        if (changed) {
          await prisma.chatter.update({ where: { id: chatter.id }, data: { images: JSON.stringify(newImages) } });
          chatterFixed++;
        }
      } catch {
        // ignore invalid JSON
      }
    }
    results["chatter"] = chatterFixed;

    // 9. 修复 SiteConfig.value (可能包含 URL)
    const configs = await prisma.siteConfig.findMany();
    let configFixed = 0;
    for (const config of configs) {
      if (config.value.includes("r2.cloudflarestorage.com") && !config.value.includes("r2.dev")) {
        try {
          // 尝试解析 JSON 数组 (如 bgImages)
          const arr = JSON.parse(config.value);
          if (Array.isArray(arr)) {
            const newArr = arr.map((url: string) => {
              if (typeof url === "string" && url.includes("r2.cloudflarestorage.com") && !url.includes("r2.dev")) {
                return getFileUrl(cleanUrlPath(url));
              }
              return url;
            });
            await prisma.siteConfig.update({ where: { id: config.id }, data: { value: JSON.stringify(newArr) } });
            configFixed++;
            continue;
          }
        } catch {
          // not JSON, treat as plain string
        }
        // plain string URL
        const key = cleanUrlPath(config.value);
        const newUrl = getFileUrl(key);
        await prisma.siteConfig.update({ where: { id: config.id }, data: { value: newUrl } });
        configFixed++;
      }
    }
    results["siteConfig"] = configFixed;

  return NextResponse.json({ code: 0, message: "修复完成", results });
}

export async function GET(request: NextRequest) {
  try {
    return await doFix(request);
  } catch (err: any) {
    console.error("Fix URLs error:", err);
    return NextResponse.json(
      { code: 1, message: err?.message || "修复失败" },
      { status: err?.message === "未登录" || err?.message === "无效的令牌" ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await doFix(request);
  } catch (err: any) {
    console.error("Fix URLs error:", err);
    return NextResponse.json(
      { code: 1, message: err?.message || "修复失败" },
      { status: err?.message === "未登录" || err?.message === "无效的令牌" ? 401 : 500 }
    );
  }
}
