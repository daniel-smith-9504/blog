import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  const { visitorId } = await params;
  const id = Number(visitorId);
  await prisma.visitor.delete({ where: { id } });
  return NextResponse.json({ code: 0, message: "success" });
}
