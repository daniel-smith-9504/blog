import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

export interface EpubMeta {
  title: string;
  author: string;
  description: string;
  excerpt?: string;
  coverBuffer?: Buffer;
  coverExt?: string;
}

export interface EpubChapter {
  title: string;
  href: string;
}

// 过滤掉非正文目录项：版权、前言、序、目录、附录、后记、声明、致谢等
const NON_CHAPTER_PATTERNS = [
  /^版权/i,
  /^著作?权/i,
  /^前\s*言/i,
  /^序\s*言/i,
  /^序$/i,
  /^自\s*序/i,
  /^译\s*序/i,
  /^介\s*绍/i,
  /^简\s*介/i,
  /^目\s*录/i,
  /^章\s*节/i,
  /^附\s*录/i,
  /^后\s*记/i,
  /^跋/i,
  /^声\s*明/i,
  /^致\s*谢/i,
  /^关于作者/i,
  /^关于本书/i,
  /^出版说明/i,
  /^编\s*者/i,
  /^推\s*荐/i,
  /^导\s*读/i,
  /^引\s*言/i,
  /^概\s*述/i,
  /^总\s*览/i,
  /^封\s*面/i,
  /^书名页/i,
  /^封底/i,
  /^插\s*图/i,
  /^图\s*片/i,
  /^说\s*明/i,
  /^注\s*释/i,
  /^参\s*考/i,
  /^文\s*献/i,
  /^索\s*引/i,
  /^表$/i,
  /^图$/i,
];

export function isRealChapter(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  return !NON_CHAPTER_PATTERNS.some((p) => p.test(t));
}

export async function parseEpubMeta(buffer: Buffer): Promise<EpubMeta> {
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) {
    return { title: "", author: "", description: "" };
  }

  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
  const rootfile = containerDoc.getElementsByTagName("rootfile")[0];
  const opfPath = rootfile?.getAttribute("full-path") || "";
  if (!opfPath) {
    return { title: "", author: "", description: "" };
  }

  const opfBase = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  const opfXml = await zip.file(opfPath)?.async("string");
  if (!opfXml) {
    return { title: "", author: "", description: "" };
  }

  const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");

  const getText = (tag: string) => {
    const el = opfDoc.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() || "";
  };

  const title = getText("dc:title");
  const author = getText("dc:creator") || getText("dc:author");
  const description = getText("dc:description");

  let coverBuffer: Buffer | undefined;
  let coverExt = "jpg";

  const metaEls = opfDoc.getElementsByTagName("meta");
  let coverId = "";
  for (let i = 0; i < metaEls.length; i++) {
    const meta = metaEls[i];
    if (meta.getAttribute("name") === "cover") {
      coverId = meta.getAttribute("content") || "";
      break;
    }
  }

  let coverHref = "";
  const itemEls = opfDoc.getElementsByTagName("item");

  for (let i = 0; i < itemEls.length; i++) {
    const item = itemEls[i];
    const id = item.getAttribute("id") || "";
    const href = item.getAttribute("href") || "";
    const mediaType = item.getAttribute("media-type") || "";

    if (id === coverId && href) {
      coverHref = href;
    }
    if (!coverHref && (id.toLowerCase().includes("cover") || href.toLowerCase().includes("cover"))) {
      if (mediaType.startsWith("image/")) {
        coverHref = href;
      }
    }
  }

  if (coverHref) {
    const coverPath = opfBase + coverHref;
    const coverFile = zip.file(coverPath);
    if (coverFile) {
      coverBuffer = Buffer.from(await coverFile.async("arraybuffer"));
      const ext = coverHref.split(".").pop()?.toLowerCase();
      if (ext) coverExt = ext === "jpeg" ? "jpg" : ext;
    }
  }

  // 尝试从第一章提取摘录（纯文本前 300 字）
  let excerpt = "";
  try {
    const spineEl = opfDoc.getElementsByTagName("spine")[0];
    const itemrefs = spineEl?.getElementsByTagName("itemref");
    if (itemrefs && itemrefs.length > 0) {
      const firstIdref = itemrefs[0].getAttribute("idref") || "";
      const manifestItems = opfDoc.getElementsByTagName("item");
      let firstHref = "";
      for (let i = 0; i < manifestItems.length; i++) {
        const item = manifestItems[i];
        if (item.getAttribute("id") === firstIdref) {
          firstHref = item.getAttribute("href") || "";
          break;
        }
      }
      if (firstHref) {
        const chapterPath = opfBase + firstHref;
        const chapterFile = zip.file(chapterPath);
        if (chapterFile) {
          const chapterHtml = await chapterFile.async("string");
          // 简单去除 HTML 标签，提取纯文本
          const plain = chapterHtml
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();
          // 过滤掉常见的前言/版权类内容，取真正的正文开头
          const skipPatterns = [/版权所有/, /著作权/, /本书仅供/, /前言/, /序言/, /目录/];
          let startIdx = 0;
          for (const p of skipPatterns) {
            const m = plain.search(p);
            if (m >= 0 && m < 200) {
              const end = plain.indexOf("\n", m);
              if (end > m) startIdx = end + 1;
            }
          }
          const content = plain.substring(startIdx).trim();
          excerpt = content.substring(0, 300);
        }
      }
    }
  } catch {
    // 提取失败不影响主流程
  }

  return { title, author, description, excerpt, coverBuffer, coverExt };
}

export async function parseEpubChapters(buffer: Buffer): Promise<EpubChapter[]> {
  const zip = await JSZip.loadAsync(buffer);
  const chapters: EpubChapter[] = [];

  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) return chapters;

  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
  const rootfile = containerDoc.getElementsByTagName("rootfile")[0];
  const opfPath = rootfile?.getAttribute("full-path") || "";
  if (!opfPath) return chapters;

  const opfBase = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  const opfXml = await zip.file(opfPath)?.async("string");
  if (!opfXml) return chapters;

  const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");

  // 1. Try EPUB 2 NCX
  const spineEl = opfDoc.getElementsByTagName("spine")[0];
  const ncxId = spineEl?.getAttribute("toc") || "";
  const manifestItems = opfDoc.getElementsByTagName("item");
  const manifestMap = new Map<string, string>();
  let ncxHref = "";
  let navHref = "";

  for (let i = 0; i < manifestItems.length; i++) {
    const item = manifestItems[i];
    const id = item.getAttribute("id") || "";
    const href = item.getAttribute("href") || "";
    const props = item.getAttribute("properties") || "";
    manifestMap.set(id, href);
    if (id === ncxId) ncxHref = href;
    if (props.includes("nav")) navHref = href;
  }

  if (ncxHref) {
    const ncxPath = opfBase + ncxHref;
    const ncxXml = await zip.file(ncxPath)?.async("string");
    if (ncxXml) {
      const ncxDoc = new DOMParser().parseFromString(ncxXml, "application/xml");
      const navPoints = ncxDoc.getElementsByTagName("navPoint");
      for (let i = 0; i < navPoints.length; i++) {
        const np = navPoints[i];
        const textEl = np.getElementsByTagName("text")[0];
        const contentEl = np.getElementsByTagName("content")[0];
        const title = textEl?.textContent?.trim() || "";
        const src = contentEl?.getAttribute("src") || "";
        if (title && src && isRealChapter(title)) {
          chapters.push({ title, href: opfBase + src.split("#")[0] });
        }
      }
    }
  }

  // 2. Try EPUB 3 nav document
  if (chapters.length === 0 && navHref) {
    const navPath = opfBase + navHref;
    const navXml = await zip.file(navPath)?.async("string");
    if (navXml) {
      const navDoc = new DOMParser().parseFromString(navXml, "text/html");
      const navs = navDoc.getElementsByTagName("nav");
      for (let n = 0; n < navs.length; n++) {
        const nav = navs[n];
        const type = nav.getAttribute("epub:type") || nav.getAttribute("type") || "";
        if (type === "toc" || nav.getAttribute("role") === "doc-toc") {
          const anchors = nav.getElementsByTagName("a");
          for (let i = 0; i < anchors.length; i++) {
            const a = anchors[i];
            const title = a.textContent?.trim() || "";
            const href = a.getAttribute("href") || "";
            if (title && href && !href.startsWith("http") && isRealChapter(title)) {
              chapters.push({ title, href: opfBase + href.split("#")[0] });
            }
          }
          break;
        }
      }
    }
  }

  // 3. Fallback: use spine items without duplicates
  if (chapters.length === 0) {
    const spineItems = opfDoc.getElementsByTagName("itemref");
    for (let i = 0; i < spineItems.length; i++) {
      const idref = spineItems[i].getAttribute("idref") || "";
      const href = manifestMap.get(idref);
      if (href && !chapters.find(c => c.href === opfBase + href)) {
        chapters.push({ title: `第${i + 1}章`, href: opfBase + href });
      }
    }
  }

  return chapters;
}
