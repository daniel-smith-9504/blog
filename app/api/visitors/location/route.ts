import { NextRequest, NextResponse } from "next/server";
import { getClientIp, fetchGeo } from "@/app/lib/utils";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const geo = await fetchGeo(ip);
  return NextResponse.json({ code: 0, data: geo });
}
