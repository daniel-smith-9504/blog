import { prisma } from "./prisma";

function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

function parseBrowser(ua: string): string {
  if (!ua) return "未知浏览器";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR/")) return "Opera";
  return "未知浏览器";
}

function parseOS(ua: string): string {
  if (!ua) return "未知系统";
  if (ua.includes("Windows NT 10.0")) return "Windows 10/11";
  if (ua.includes("Windows NT 6.3")) return "Windows 8.1";
  if (ua.includes("Windows NT 6.1")) return "Windows 7";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "未知系统";
}

export async function recordLoginLog({
  request,
  userId,
  username,
  summary,
}: {
  request: Request;
  userId: number;
  username: string;
  summary: string;
}) {
  try {
    const ua = request.headers.get("user-agent") || "";
    await prisma.loginLog.create({
      data: {
        user_id: userId,
        username,
        ip: getClientIp(request),
        address: "",
        system: parseOS(ua),
        browser: parseBrowser(ua),
        summary,
      },
    });
  } catch (e) {
    console.error("记录登录日志失败:", e);
  }
}
