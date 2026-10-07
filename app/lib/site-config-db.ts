import { prisma } from "./prisma";

let cachedConfig: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5_000; // 5秒缓存，后台修改后前台更快生效

/** 从数据库获取所有站点配置 */
export async function getDbSiteConfig(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  const rows = await prisma.siteConfig.findMany();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }

  cachedConfig = result;
  cacheTime = now;
  return result;
}

/** 获取单个配置值 */
export async function getDbConfigValue(key: string, defaultValue = ""): Promise<string> {
  const config = await getDbSiteConfig();
  return config[key] ?? defaultValue;
}

/** 清除缓存（后台更新配置后调用） */
export function clearSiteConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}
