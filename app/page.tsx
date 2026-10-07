import HomeClient from "./HomeClient";
import { prisma } from "@/app/lib/prisma";

// 首页统计是动态数据，不允许 Next.js / CDN 缓存
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchProfileData() {
  try {
    const [postCount, chatterCount, albums] = await Promise.all([
      prisma.post.count({ where: { status: "published" } }),
      prisma.chatter.count({ where: { status: "published" } }),
      prisma.album.findMany({ include: { _count: { select: { photos: true } } } }),
    ]);
    return {
      postCount,
      chatterCount,
      photoCount: albums.reduce((acc, a) => acc + a._count.photos, 0),
    };
  } catch {
    return { postCount: 0, chatterCount: 0, photoCount: 0 };
  }
}

export default async function Home() {
  const { postCount, chatterCount, photoCount } = await fetchProfileData();

  return (
    <HomeClient
      postCount={postCount}
      chatterCount={chatterCount}
      photoCount={photoCount}
    />
  );
}