import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const { albumId } = await params;
  const id = Number(albumId);
  const photos = await prisma.photo.findMany({
    where: { album_id: id },
    orderBy: { sort: "asc" },
  });
  return NextResponse.json(photos);
}
