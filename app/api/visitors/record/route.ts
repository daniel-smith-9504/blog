import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  getClientIp,
  parseUserAgent,
  fetchGeo,
  getOrgCn,
} from "@/app/lib/utils";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const path = request.headers.get("x-path") || "";
  const ua = request.headers.get("user-agent") || "";

  // 去重：同一天同一IP只记录一次
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await prisma.visitor.findFirst({
    where: {
      ip,
      created_at: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  if (existing) {
    // 已存在今日记录，更新访问路径和时间即可，不创建新记录
    const updated = await prisma.visitor.update({
      where: { id: existing.id },
      data: {
        path,
        user_agent: ua,
        created_at: new Date(), // 刷新为最新访问时间
      },
    });
    return NextResponse.json({ code: 0, message: "updated", data: updated });
  }

  const parsed = parseUserAgent(ua);
  const geo = await fetchGeo(ip);

  const visitor = await prisma.visitor.create({
    data: {
      ip,
      path,
      user_agent: ua,
      city: (geo.city as string) || "",
      region: (geo.region as string) || "",
      country: (geo.country as string) || "",
      district: (geo.district as string) || "",
      org: getOrgCn((geo.org as string) || "", (geo.asn as string) || ""),
      asn: (geo.asn as string) || "",
      is_mobile: (geo.is_mobile as boolean) || false,
      is_proxy: (geo.is_proxy as boolean) || false,
      is_hosting: (geo.is_hosting as boolean) || false,
      browser: parsed.browser,
      os: parsed.os,
      device_type: parsed.device_type,
    },
  });

  return NextResponse.json({ code: 0, message: "success", data: visitor });
}
