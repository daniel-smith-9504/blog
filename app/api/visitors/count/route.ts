import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const count = await prisma.visitor.count();
  return NextResponse.json({ code: 0, count });
}
