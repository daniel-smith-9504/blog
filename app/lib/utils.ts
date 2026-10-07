export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "127.0.0.1";
}

export function parseUserAgent(ua: string) {
  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  const device = /Mobi|Android|iPhone/.test(ua) ? "手机" : "电脑";

  return { browser, os, device_type: device };
}

const PROVINCE_MAP: Record<string, string> = {
  beijing: "北京", tianjin: "天津", shanghai: "上海", chongqing: "重庆",
  hebei: "河北", shanxi: "山西", "inner mongolia": "内蒙古",
  liaoning: "辽宁", jilin: "吉林", heilongjiang: "黑龙江",
  jiangsu: "江苏", zhejiang: "浙江", anhui: "安徽", fujian: "福建",
  jiangxi: "江西", shandong: "山东", henan: "河南", hubei: "湖北",
  hunan: "湖南", guangdong: "广东", guangxi: "广西", hainan: "海南",
  sichuan: "四川", guizhou: "贵州", yunnan: "云南", tibet: "西藏",
  shaanxi: "陕西", gansu: "甘肃", qinghai: "青海", ningxia: "宁夏",
  xinjiang: "新疆", "hong kong": "香港", macau: "澳门", taiwan: "台湾",
};

const ASN_ORG_MAP: Record<string, string> = {
  "56041": "中国移动", "56042": "中国移动", "56043": "中国移动",
  "56044": "中国移动", "56045": "中国移动", "56046": "中国移动",
  "56047": "中国移动", "56048": "中国移动", "58453": "中国移动",
  "9808": "中国移动", "24400": "中国移动", "24444": "中国移动", "24445": "中国移动",
  "4808": "中国联通", "4837": "中国联通", "9929": "中国联通", "17816": "中国联通",
  "4134": "中国电信", "4809": "中国电信", "4812": "中国电信",
  "23724": "中国电信", "140061": "中国电信",
  "4538": "中国教育网",
  "45102": "阿里云", "37963": "阿里云", "45090": "阿里云",
  "45069": "腾讯云", "132203": "腾讯云",
  "136907": "华为云", "55967": "百度云", "137696": "火山引擎",
  "13335": "Cloudflare", "209242": "Cloudflare",
};

export function getOrgCn(org: string, asn: string): string {
  if (!org) return "";
  const orgLower = org.toLowerCase().replace(/[,.&]/g, "");

  let province = "";
  for (const [eng, cn] of Object.entries(PROVINCE_MAP)) {
    if (orgLower.includes(eng)) {
      province = cn;
      break;
    }
  }

  if (orgLower.includes("china mobile") || orgLower.includes("chinamobile") || orgLower.includes("cmcc")) {
    return province ? `中国移动(${province})` : "中国移动";
  }
  if (orgLower.includes("china unicom") || orgLower.includes("chinaunicom") || orgLower.includes("cucc")) {
    return province ? `中国联通(${province})` : "中国联通";
  }
  if (orgLower.includes("china telecom") || orgLower.includes("chinatelecom") || orgLower.includes("chinanet") || orgLower.includes("ctcc")) {
    return province ? `中国电信(${province})` : "中国电信";
  }
  if (orgLower.includes("cernet") || orgLower.includes("cernt") || orgLower.includes("china education")) {
    return "中国教育网";
  }
  if (orgLower.includes("mobile") || org.includes("移动")) {
    return province ? `${province}移动` : "移动运营商";
  }
  if (orgLower.includes("unicom") || orgLower.includes("united network") || orgLower.includes("uninet")) {
    return province ? `${province}联通` : "中国联通";
  }
  if (orgLower.includes("telecom") || orgLower.includes("chinanet") || orgLower.includes("telecommunications")) {
    return province ? `${province}电信` : "中国电信";
  }
  if (orgLower.includes("netcom") || orgLower.includes("cnc")) {
    return "中国网通";
  }
  if (orgLower.includes("cable")) {
    return province ? `${province}广电` : "有线电视网络";
  }
  if (orgLower.includes("broadcast") || orgLower.includes("radio") || orgLower.includes("tv")) {
    return province ? `${province}广电` : "广电网络";
  }
  if (orgLower.includes("huashu") || orgLower.includes("wasu")) {
    return "华数传媒";
  }

  const vendors: [string, string][] = [
    ["alibaba", "阿里巴巴"], ["aliyun", "阿里云"],
    ["tencent", "腾讯"], ["tencent cloud", "腾讯云"],
    ["baidu", "百度"], ["huawei", "华为"], ["huawei cloud", "华为云"],
    ["bytedance", "字节跳动"], ["volcengine", "火山引擎"],
    ["kuaishou", "快手"], ["meituan", "美团"], ["xiaomi", "小米"],
    ["jd", "京东"], ["netease", "网易"],
    ["kingsoft", "金山云"], ["qihoo 360", "奇虎360"],
    ["sina", "新浪"], ["sohu", "搜狐"], ["douban", "豆瓣"],
    ["amazon", "亚马逊"], ["aws", "亚马逊云"], ["microsoft", "微软"],
    ["azure", "微软云"], ["google", "谷歌"], ["cloudflare", "Cloudflare"],
    ["oracle", "甲骨文"], ["ovh", "OVH"], ["digitalocean", "DigitalOcean"],
    ["hetzner", "Hetzner"], ["apple", "苹果"],
  ];
  for (const [kw, name] of vendors) {
    if (orgLower.includes(kw)) return name;
  }

  if (asn) {
    const asnNum = asn.replace(/AS/i, "").trim();
    if (ASN_ORG_MAP[asnNum]) return ASN_ORG_MAP[asnNum];
  }

  return "";
}

const geoCache = new Map<string, Record<string, unknown>>();

export async function fetchGeo(ip: string): Promise<Record<string, unknown>> {
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {};
  }

  let result: Record<string, unknown> = {};

  try {
    const resp = await fetch(`https://uapis.cn/api/v1/network/ipinfo?ip=${ip}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json();
    if (data.ip) {
      const parts = (data.region || "").split(" ");
      result = {
        country: parts[0] || "",
        region: parts[1] || "",
        city: parts[2] || "",
        district: "",
        org: data.isp || "",
        asn: data.asn || data.as || "",
        is_mobile: false,
        is_proxy: false,
        is_hosting: false,
      };
    }
  } catch {
    // ignore
  }

  if (!result.country && !ip.includes(":")) {
    try {
      const resp = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=66846719`, { signal: AbortSignal.timeout(3000) });
      const data = await resp.json();
      if (data.status === "success") {
        result = {
          city: data.city || "",
          region: data.regionName || "",
          country: data.country || "",
          district: data.district || "",
          org: data.org || data.isp || "",
          asn: data.as || "",
          is_mobile: !!data.mobile,
          is_proxy: !!data.proxy,
          is_hosting: !!data.hosting,
        };
      }
    } catch {
      // ignore
    }
  }

  geoCache.set(ip, result);
  return result;
}
