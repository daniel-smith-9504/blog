import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";

function getSecretKey(): Uint8Array {
  if (process.env.SECRET_KEY) {
    return new TextEncoder().encode(process.env.SECRET_KEY);
  }
  // 使用固定派生密钥作为 fallback，避免每次重启导致所有用户 token 失效
  // 生产环境请务必设置 SECRET_KEY 环境变量，不要使用默认 fallback
  const fallbackKey = createHash("sha256")
    .update("Blog-Default-Secret-Key-Please-Change-In-Production")
    .digest("hex");
  return new TextEncoder().encode(fallbackKey);
}

const SECRET_KEY = getSecretKey();
const ALGORITHM = "HS256";
const ACCESS_TOKEN_EXPIRE_HOURS = 72;
const REFRESH_TOKEN_EXPIRE_DAYS = 30;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export async function createToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRE_HOURS}h`)
    .sign(SECRET_KEY);
}

export async function createRefreshToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: ALGORITHM })
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRE_DAYS}d`)
    .sign(SECRET_KEY);
}

export async function decodeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      clockTolerance: 60,
    });
    return payload;
  } catch {
    throw new Error("无效的令牌");
  }
}

export async function getCurrentUser(request: Request) {
  // 优先从 Authorization header 读取
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    return decodeToken(token);
  }

  // 支持从 Cookie 读取（用于浏览器直接访问）
  const cookieHeader = (request as any).headers?.get?.("cookie") || "";
  const tokenMatch = cookieHeader.match(/authorized-token=([^;]+)/);
  if (tokenMatch) {
    try {
      const cookieData = JSON.parse(decodeURIComponent(tokenMatch[1]));
      if (cookieData.accessToken) {
        return decodeToken(cookieData.accessToken);
      }
    } catch {
      // cookie 格式不对，忽略
    }
  }

  throw new Error("未登录");
}
