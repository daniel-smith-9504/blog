"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Settings, Minus, Plus, Download, BookOpen, ChevronLeft, ChevronRight, List, X, Maximize2, Minimize2, Highlighter } from "lucide-react";
import { isRealChapter } from "../../lib/epub-parser";
import LoadingTips from "../_lib/LoadingTips";

interface BookDetail {
  id: number;
  title: string;
  author: string;
  cover: string;
  description: string;
  file_url: string;
  format: string;
  file_size: number;
  category_id: number | null;
  views: number;
  chapter_count: number;
  category?: { id: number; name: string; slug: string } | null;
}

interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
  theme: string;
  customColor: string;
  contentWidth: string;
  flow: "paginated" | "scrolled-doc";
}

const defaultSettings: ReadingSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  paragraphSpacing: 16,
  fontFamily: "serif",
  theme: "default",
  customColor: "#f5f0e8",
  contentWidth: "normal",
  flow: "paginated",
};

const READING_SETTINGS_KEY = "book_reading_settings";
const NOTES_KEY_PREFIX = "book_notes_";
const PROGRESS_KEY_PREFIX = "book_progress_";

function notesKey(bookId: number | string) {
  return NOTES_KEY_PREFIX + bookId;
}

function progressKey(bookId: number | string) {
  return PROGRESS_KEY_PREFIX + bookId;
}

// ========== 笔记存储（localStorage） ==========
function loadLocalNotes(bookId: number | string): any[] {
  try {
    const raw = localStorage.getItem(notesKey(bookId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotes(bookId: number | string, notes: any[]) {
  localStorage.setItem(notesKey(bookId), JSON.stringify(notes));
}

// ========== 阅读进度（localStorage） ==========
interface ReadingProgress {
  cfi: string;
  chapterTitle: string;
  chapterIndex: number;
  updatedAt: number;
}

function loadProgress(bookId: number | string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(bookId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgress(bookId: number | string, progress: ReadingProgress) {
  localStorage.setItem(progressKey(bookId), JSON.stringify(progress));
}

function loadSettings(): ReadingSettings {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(READING_SETTINGS_KEY);
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        /* */
      }
    }
  }
  return defaultSettings;
}

function saveSettings(s: ReadingSettings) {
  localStorage.setItem(READING_SETTINGS_KEY, JSON.stringify(s));
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookUrl as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [chapters, setChapters] = useState<{id:number;title:string;href:string;order:number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [epubError, setEpubError] = useState("");
  const [atStart, setAtStart] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [toc, setToc] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [currentHref, setCurrentHref] = useState("");
  const [initialChapter, setInitialChapter] = useState<string | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [excerpt, setExcerpt] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPos, setHighlightMenuPos] = useState<{x:number;y:number}>({x:0,y:0});
  const [excerpts, setExcerpts] = useState<string[]>([]);
  const [excerptIndex, setExcerptIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const notesRef = useRef<any[]>([]);

  useEffect(() => {
    setSettings(loadSettings());
    // 检测登录状态：取 github_token
    const token = localStorage.getItem("github_token");
    if (token) {
      setIsLoggedIn(true);
      setAuthToken(token);
    }
  }, []);

  // 从书中提取多个金句（用于详情页右侧动画展示）
  useEffect(() => {
    async function extract() {
      if (!book) return;
      try {
        let allText = "";
        if (book.format === "txt") {
          const res = await fetch(book.file_url);
          allText = await res.text();
        } else if (book.format === "epub") {
          const JSZip = (await import("jszip")).default;
          const res = await fetch(book.file_url);
          const buf = await res.arrayBuffer();
          const zip = await JSZip.loadAsync(buf);
          const containerXml = await zip.file("META-INF/container.xml")?.async("text");
          if (!containerXml) return;
          const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
          if (!opfPathMatch) return;
          const opfPath = opfPathMatch[1];
          const opfXml = await zip.file(opfPath)?.async("text");
          if (!opfXml) return;
          // 解析 manifest，找出所有章节
          const manifestMatches = [...opfXml.matchAll(/<item[^>]+href="([^"]+)"[^>]*media-type="application\/xhtm[l]?\+xml"[^>]*>/gi)];
          const opfBase = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
          // 读取前 3-5 个章节的内容
          const chaptersToRead = manifestMatches.slice(0, 5);
          for (const m of chaptersToRead) {
            const href = m[1];
            const chapPath = opfBase + href;
            const chapContent = await zip.file(chapPath)?.async("text");
            if (chapContent) allText += chapContent + " ";
          }
        }
        if (!allText) return;
        // 清理文本：去除 HTML 标签、多余空白
        const clean = allText.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        // 按句子分割，过滤掉版权/出版/声明/设计/ISBN/排版/购买/法律等信息类句子
        const rawSentencesForDesc = clean.split(/[。！？!?；;\n]/).map(s => s.trim()).filter(Boolean);
        const infoKeywords = ["版权", "出版", "声明", "ISBN", "设计", "排版", "发行", "印刷", "出版社", "版次", "印次", "开本", "定价", "版权所有", "请勿", "未经", "购买", "正本", "正版", "法律", "后果", "购买正版", "对本书", "如感兴趣", "法律责任", "转载", "摘录", "授权", "盗版"];
        const cleanSentences = rawSentencesForDesc.filter(s => !infoKeywords.some(kw => s.includes(kw)));
        // 用过滤后的正文前 300 字作为简介
        setExcerpt(cleanSentences.join("。").slice(0, 300));
        // 分割句子：按中文句号、问号、感叹号、分号分割
        const rawSentences = clean.split(/[。！？!?；;\n]/).map(s => s.trim()).filter(Boolean);
        // 过滤：长度 15-80 字的句子（太短没意义，太长一行放不下），过滤纯数字/标点内容
        const filtered = rawSentences.filter(s => {
          const len = s.length;
          if (len < 15 || len > 80) return false;
          // 过滤含大量英文/数字/特殊字符的内容
          const chineseCount = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
          return chineseCount / len > 0.6;
        });
        // 去重（按内容相似度简单去重）
        const unique: string[] = [];
        for (const s of filtered) {
          const short = s.slice(0, 20);
          if (!unique.find(u => u.slice(0, 20) === short)) unique.push(s);
          if (unique.length >= 12) break;
        }
        setExcerpts(unique);
      } catch (e) {
        console.error("Excerpt extraction failed:", e);
      }
    }
    extract();
  }, [book]);

  // 摘录轮播动画：每 6 秒切换一句
  useEffect(() => {
    if (excerpts.length <= 1) return;
    const timer = setInterval(() => {
      setExcerptIndex(i => (i + 1) % excerpts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [excerpts.length]);

  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      )
        setShowSettings(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSettings]);

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    if (!book || !isLoggedIn) return;
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch(`/api/books/${book.id}/notes`, { headers });
      if (res.ok) {
        const data = await res.json();
        const notesData = data.notes || [];
        setNotes(notesData);
        notesRef.current = notesData;
        // 如果 rendition 已经准备好，立刻恢复高亮
        if (renditionRef.current && notesData.length > 0) {
          const colorMap: Record<string, string> = {
            "#facc15": "hl-yellow",
            "#f87171": "hl-red",
            "#60a5fa": "hl-blue",
            "#4ade80": "hl-green",
          };
          notesData.forEach((note: any) => {
            try {
              if (!note.cfi || note.cfi === "") return;
              const cls = colorMap[note.color] || "hl-yellow";
              renditionRef.current.annotations.add(
                "highlight",
                note.cfi,
                { color: note.color, text: note.text },
                () => {},
                cls
              );
            } catch (err) {}
          });
        }
      }
    } catch { /* ignore */ }
  }, [book, isLoggedIn, authToken]);

  const addHighlight = useCallback(async (color: string) => {
    if (!renditionRef.current || !selectedRange || !book) return;
    try {
      const colorClassMap: Record<string, string> = {
        "#facc15": "hl-yellow",
        "#f87171": "hl-red",
        "#60a5fa": "hl-blue",
        "#4ade80": "hl-green",
      };
      const className = colorClassMap[color] || "hl-yellow";

      // 先画高亮
      renditionRef.current.annotations.add(
        "highlight",
        selectedRange,
        { color, text: selectedText },
        () => {},
        className,
        { fill: color, "fill-opacity": "0.35", stroke: color, "stroke-opacity": "0.1" }
      );

      // 如果已登录，保存到后端
      if (isLoggedIn && authToken) {
        const res = await fetch(`/api/books/${book.id}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            text: selectedText,
            chapter_title: currentHref,
            color,
            cfi: selectedRange,
          }),
        });
        if (res.ok) {
          fetchNotes(); // 刷新笔记列表
        }
      }

      setShowHighlightMenu(false);
      setSelectedRange(null);
      setSelectedText(null);
    } catch (e) {
      console.error("Add highlight failed:", e);
    }
  }, [book, selectedRange, selectedText, currentHref, isLoggedIn, authToken, fetchNotes]);

  const deleteNote = useCallback(async (noteId: number, noteCfi: string) => {
    if (!book) return;
    try {
      // 从页面移除高亮
      if (renditionRef.current && noteCfi) {
        try {
          renditionRef.current.annotations.remove(noteCfi, "highlight");
        } catch {}
      }
      // 从后端删除
      if (isLoggedIn && authToken) {
        await fetch(`/api/books/${book.id}/notes?note_id=${noteId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${authToken}` },
        });
      }
      // 刷新本地列表
      fetchNotes();
    } catch { /* ignore */ }
  }, [book, isLoggedIn, authToken, fetchNotes]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("图书不存在");
          } else {
            setError("获取图书失败");
          }
          return;
        }
        const data = await res.json();
        setBook(data.book);

        // Fetch chapters
        const chaptersRes = await fetch(`/api/books/${bookId}/chapters`);
        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          setChapters(chaptersData.chapters || []);
        }

        // 获取阅读进度
        try {
          const progressRes = await fetch(`/api/books/${bookId}/progress`);
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            if (progressData.progress) {
              setReadingProgress(progressData.progress);
            }
          }
        } catch { /* ignore */ }
      } catch {
        setError("网络错误");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [bookId]);

  // flow 切换时重新加载 EPUB
  useEffect(() => {
    if (reading && book?.format === "epub" && renditionRef.current) {
      renditionRef.current.destroy();
      renditionRef.current = null;
      setTextLoading(true);
      setTimeout(() => {
        startReading();
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.flow]);

  const startReading = useCallback(async (target?: string | number) => {
    if (!book) return;
    setReading(true);

    if (book.format === "txt") {
      setTextLoading(true);
      try {
        const res = await fetch(book.file_url);
        const text = await res.text();
        setTextContent(text);
      } catch {
        setEpubError("加载文本内容失败");
      } finally {
        setTextLoading(false);
      }
      return;
    }

    if (book.format === "epub") {
      // 如果已经加载过 EPUB，直接跳转目标章节，避免重新初始化
      if (renditionRef.current && bookRef.current && target !== undefined) {
        try {
          let jumped = false;
          if (typeof target === "string" && toc.length > 0) {
            // 1. 精确匹配标题
            let matched = toc.find((it: any) => it.label === target);
            // 2. 包含匹配
            if (!matched) matched = toc.find((it: any) => it.label?.includes(target) || target.includes(it.label));
            // 3. 按章节 href 匹配（DB 章节的 href 和 toc 的 href）
            if (!matched) {
              const chapter = chapters.find(c => c.title === target);
              if (chapter?.href) {
                const hrefPart = chapter.href.split("/").pop() || "";
                matched = toc.find((it: any) => it.href?.includes(hrefPart));
              }
            }
            if (matched && matched.href) {
              await renditionRef.current.display(matched.href);
              jumped = true;
            }
          }
          // 没匹配到就尝试直接用 href 跳转
          if (!jumped && typeof target === "string") {
            await renditionRef.current.display(target);
            jumped = true;
          }
          if (jumped) return;
        } catch (e) {
          console.error("Display target failed:", e);
        }
      }

      setTextLoading(true);
      setEpubError("");
      try {
        if (keyHandlerRef.current) {
          document.removeEventListener("keydown", keyHandlerRef.current);
          keyHandlerRef.current = null;
        }
        if (clickHandlerRef.current && viewerRef.current) {
          viewerRef.current.removeEventListener("click", clickHandlerRef.current);
          clickHandlerRef.current = null;
        }
        if (renditionRef.current) {
          renditionRef.current.destroy();
          renditionRef.current = null;
        }
        if (bookRef.current) {
          bookRef.current.destroy?.();
          bookRef.current = null;
        }

        const epubModule = await import("epubjs");
        const ePub = epubModule.default || (epubModule as any);

        const fullUrl = book.file_url.startsWith("http")
          ? book.file_url
          : `${window.location.origin}${book.file_url}`;
        const book_epub = ePub(fullUrl);
        bookRef.current = book_epub;

        // 先加载目录，存储起来供后续匹配使用
        const nav = await book_epub.loaded.navigation;
        const rawToc = nav.toc || [];
        const filtered = rawToc.filter((item: any) => isRealChapter(item.label || ""));
        setToc(filtered);

        const rendition = book_epub.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: settings.flow,
        });

        // 监听渲染错误
        rendition.on("displayError", (err: any) => {
          console.error("Rendition display error:", err);
          setEpubError("EPUB 渲染失败: " + (err?.message || "未知错误"));
          setTextLoading(false);
        });

        // 监听文本选择（划线笔记）
        rendition.on("selected", (cfiRange: string, contents: any) => {
          const text = contents.window?.getSelection()?.toString().trim();
          if (!text) return;
          setSelectedText(text);
          setSelectedRange(cfiRange);
          try {
            const selection = contents.window.getSelection();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const viewerRect = viewerRef.current!.getBoundingClientRect();
            setHighlightMenuPos({
              x: rect.left - viewerRect.left + rect.width / 2,
              y: rect.top - viewerRect.top - 10,
            });
          } catch {
            setHighlightMenuPos({ x: 0, y: 0 });
          }
          setShowHighlightMenu(true);
        });

        // 决定初始跳转目标
        let displayTarget: any = undefined;
        // 1. 优先：如果传了章节标题，去 toc 中匹配
        if (target !== undefined && filtered.length > 0) {
          if (typeof target === "string") {
            // 精确匹配
            let matched = filtered.find((it: any) => it.label === target);
            // 包含匹配
            if (!matched) matched = filtered.find((it: any) => it.label?.includes(target) || target.includes(it.label));
            // 按 href 匹配
            if (!matched) {
              const chapter = chapters.find(c => c.title === target);
              if (chapter?.href) {
                const hrefPart = chapter.href.split("/").pop() || "";
                matched = filtered.find((it: any) => it.href?.includes(hrefPart));
              }
            }
            if (matched) displayTarget = matched.href;
          } else if (typeof target === "number" && target >= 0 && target < filtered.length) {
            displayTarget = filtered[target].href;
          }
        }
        // 2. 其次：本地存储的阅读进度
        if (!displayTarget) {
          const savedLoc = localStorage.getItem(`book_loc_${book.id}`);
          if (savedLoc) {
            try {
              const parsed = JSON.parse(savedLoc);
              if (parsed && typeof parsed === "string" && parsed !== "undefined" && parsed !== "") {
                displayTarget = parsed;
              }
            } catch { /* ignore */ }
          }
        }
        // 3. 最后：有目录时用目录第一项，否则让 epubjs 自己决定
        if (!displayTarget && filtered.length > 0) {
          displayTarget = filtered[0].href;
        }

        try {
          await rendition.display(displayTarget);
        } catch (displayErr: any) {
          console.error("Initial display failed:", displayErr);
          try {
            await rendition.display();
          } catch (fallbackErr: any) {
            console.error("Fallback display also failed:", fallbackErr);
            throw new Error("EPUB 内容无法显示，可能文件已损坏");
          }
        }

        rendition.on("relocated", (loc: any) => {
          setAtStart(loc.atStart);
          setAtEnd(loc.atEnd);
          setCurrentHref(loc.start.href);
          localStorage.setItem(
            `book_loc_${book.id}`,
            JSON.stringify(loc.start.cfi)
          );
          // 保存阅读进度到后端（仅登录时）
          if (isLoggedIn && authToken) {
            const currentChapter = chapters.find(c => loc.start.href && c.href && loc.start.href.includes(c.href.split("/").pop() || ""));
            fetch(`/api/books/${book.id}/progress`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                chapter_id: currentChapter?.id,
                chapter_title: currentChapter?.title || "",
                position: 0,
              }),
            }).catch(() => {});
          }
        });

        // 键盘翻页（仅左右翻页模式）
        const keyHandler = (e: KeyboardEvent) => {
          if (settings.flow === "paginated") {
            if (e.key === "ArrowLeft") rendition.prev();
            if (e.key === "ArrowRight" || e.key === " ") {
              e.preventDefault();
              rendition.next();
            }
          }
        };
        keyHandlerRef.current = keyHandler;
        document.addEventListener("keydown", keyHandler);

        // 点击翻页（仅左右翻页模式）
        if (settings.flow === "paginated") {
          const clickHandler = (e: MouseEvent) => {
            setShowHighlightMenu(false);
            const rect = viewerRef.current!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            if (x < width * 0.3) rendition.prev();
            else if (x > width * 0.7) rendition.next();
          };
          clickHandlerRef.current = clickHandler;
          viewerRef.current!.addEventListener("click", clickHandler);
        }

        // 向 iframe 注入高亮颜色样式（确保不同颜色的高亮显示正确
        try {
          // 等待 rendition 完全加载
          const injectHighlightCSS = (contents: any) => {
            if (!contents || !contents.document) return;
            const doc = contents.document as Document;
            const head = doc.head;
            if (!head) return;
            const styleId = "hl-custom-styles";
            if (head.querySelector(`#${styleId}`)) return;
            const style = doc.createElement("style");
            style.id = styleId;
            style.textContent = `
              .hl-yellow { background-color: rgba(250, 204, 21, 0.35) !important; }
              .hl-red { background-color: rgba(248, 113, 113, 0.35) !important; }
              .hl-blue { background-color: rgba(96, 165, 250, 0.35) !important; }
              .hl-green { background-color: rgba(74, 222, 128, 0.35) !important; }
              .hl-yellow, .hl-red, .hl-blue, .hl-green {
                border-radius: 2px; padding: 0 1px;
              }
            `;
            head.appendChild(style);
          };

          // 在 rendition 的每个 iframe 加载完成后注入样式
          const applyNoteHighlights = () => {
            // 给每个 view 注入样式
            const views = rendition.views && Array.isArray(rendition.views) ? rendition.views() : [];
            views.forEach((v: any) => {
              injectHighlightCSS(v.contents || v);
            });
          };

          // 监听 relocated 时重新注入样式
          rendition.on("relocated", () => {
            applyNoteHighlights();
            // 重新应用已保存的笔记高亮
            if (notesRef.current && notesRef.current.length > 0) {
              notesRef.current.forEach((note: any) => {
                try {
                  if (!note.cfi || note.cfi === "") return;
                  const colorMap: Record<string, string> = {
                    "#facc15": "hl-yellow",
                    "#f87171": "hl-red",
                    "#60a5fa": "hl-blue",
                    "#4ade80": "hl-green",
                  };
                  const cls = colorMap[note.color] || "hl-yellow";
                  rendition.annotations.add(
                    "highlight",
                    note.cfi,
                    { color: note.color, text: note.text },
                    () => {},
                    cls
                  );
                } catch (err) {}
              });
            }
          });

          // 首次加载时也注入样式
          applyNoteHighlights();

          // 监听 chapterDisplayed 如果有
        } catch (err) {
          console.log("Note highlight injection skipped:", err);
        }

        renditionRef.current = rendition;
        setTextLoading(false);
        setEpubError("");
        // 加载完成后获取笔记（用于恢复高亮）
        if (book) {
          fetchNotes();
        }
      } catch (e: any) {
        console.error("EPUB load error:", e);
        setEpubError(e?.message || "EPUB 加载失败，请确认文件格式正确");
        setTextLoading(false);
      }
    }
  }, [book, chapters, settings.flow]);

  const themes: Record<string, { bg: string; text: string }> = {
    default: {
      bg: "bg-white/60 dark:bg-slate-800/60",
      text: "text-slate-800 dark:text-slate-200",
    },
    sepia: {
      bg: "bg-amber-50/80 dark:bg-amber-900/30",
      text: "text-amber-900 dark:text-amber-100",
    },
    green: {
      bg: "bg-emerald-50/80 dark:bg-emerald-900/30",
      text: "text-emerald-900 dark:text-emerald-100",
    },
  };
  const t = themes[settings.theme] || themes.default;

  if (loading) return <LoadingTips />;

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!book) return null;

  // Reading mode
  if (reading) {
    return (
      <div className="h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setReading(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-sky-500"
          >
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white text-center flex-1 px-4 truncate">
            {book.title}
          </h2>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => { setShowNotes((v) => !v); if (!showNotes) fetchNotes(); }}
                title="笔记"
                className={`p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors ${
                  showNotes
                    ? "bg-sky-500 text-white"
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-500 hover:text-sky-500"
                }`}
              >
                <Highlighter className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                setShowSettings((v) => !v);
              }}
              title="阅读设置"
              className={`p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors ${
                showSettings
                  ? "bg-sky-500 text-white"
                  : "bg-white/60 dark:bg-slate-800/60 text-slate-500 hover:text-sky-500"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 笔记侧边栏 */}

          {/* 笔记侧边栏 */}
          {showNotes && (
            <div className="absolute md:relative z-30 w-80 h-full border-r border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md flex flex-col shadow-xl md:shadow-none">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-700/30">
                <div className="flex items-center gap-2">
                  <Highlighter className="w-4 h-4 text-sky-500" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">笔记</span>
                  <span className="text-xs text-slate-400">{notes.length} 条</span>
                </div>
                <button type="button" onClick={() => setShowNotes(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Highlighter className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">暂无笔记</p>
                    <p className="text-xs mt-1">选中文本后点击「划线」即可添加</p>
                  </div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="group p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/30 hover:border-sky-200 dark:hover:border-sky-700/50 transition-colors cursor-pointer" onClick={() => {
                      if (n.cfi && renditionRef.current) {
                        try {
                          renditionRef.current.display(n.cfi);
                        } catch (err) {}
                      }
                    }}>
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: n.color || "#facc15" }}
                        />
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-3">{n.text}</p>
                      </div>
                      {n.note && (
                        <div className="mt-2 pl-3 border-l-2 border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.note}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-600/30">
                        <span className="text-[10px] text-slate-400 truncate max-w-[60%]">{n.chapter_title || "笔记"}</span>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          deleteNote(n.id, n.cfi);
                        }} className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-red-400 transition-opacity">删除</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 主内容区 */}
          <div className="flex-1 overflow-hidden relative">
            {/* Settings panel */}
            {showSettings && (
              <div
                ref={settingsRef}
                className="absolute right-4 top-4 z-50 w-80 p-4 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto"
              >
                {/* TXT 格式才显示字体相关设置，EPUB 由书籍自带样式控制 */}
                {book?.format === "txt" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">字体大小</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateSetting("fontSize", Math.max(12, settings.fontSize - 1))} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm w-8 text-center">{settings.fontSize}</span>
                        <button onClick={() => updateSetting("fontSize", Math.min(32, settings.fontSize + 1))} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">行距</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateSetting("lineHeight", Math.max(1.2, +(settings.lineHeight - 0.1).toFixed(1)))} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm w-8 text-center">{settings.lineHeight}</span>
                        <button onClick={() => updateSetting("lineHeight", Math.min(3, +(settings.lineHeight + 0.1).toFixed(1)))} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">段距</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateSetting("paragraphSpacing", Math.max(0, settings.paragraphSpacing - 4))} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm w-8 text-center">{settings.paragraphSpacing}</span>
                        <button onClick={() => updateSetting("paragraphSpacing", Math.min(48, settings.paragraphSpacing + 4))} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">字体</span>
                      <div className="flex gap-2">
                        {[["serif","宋体"],["sans-serif","黑体"],["system-ui","系统"]].map(([val,label]) => (
                          <button key={val} onClick={() => updateSetting("fontFamily", val)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.fontFamily === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>{label}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">背景</span>
                    <div className="flex gap-2">
                      {[["default","默认"],["sepia","护眼"],["green","绿意"],["custom","自定义"]].map(([val,label]) => (
                        <button key={val} onClick={() => updateSetting("theme", val)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.theme === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  {settings.theme === "custom" && (
                    <div className="flex items-center justify-end gap-2">
                      <input type="color" title="自定义背景色" value={settings.customColor} onChange={(e) => updateSetting("customColor", e.target.value)} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{settings.customColor}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">宽度</span>
                  <div className="flex gap-2">
                    {[["narrow","窄"],["normal","标准"],["wide","宽"]].map(([val,label]) => (
                      <button key={val} onClick={() => updateSetting("contentWidth", val)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.contentWidth === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">翻页方式</span>
                  <div className="flex gap-2">
                    {[["paginated","左右翻页"],["scrolled-doc","上下滚动"]].map(([val,label]) => (
                      <button key={val} onClick={() => updateSetting("flow", val as any)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.flow === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

        {/* EPUB Viewer */}
        {book.format === "epub" && (
          <div className="relative h-full flex justify-center">
            <div
              className={`${
                settings.theme === "custom" ? "" : t.bg
              } backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden relative h-full w-full ${
                settings.contentWidth === "narrow" ? "max-w-md" :
                settings.contentWidth === "normal" ? "max-w-xl" :
                settings.contentWidth === "wide" ? "max-w-4xl" : ""
              }`}
              style={{
                ...(settings.theme === "custom"
                  ? { backgroundColor: settings.customColor }
                  : {}),
              }}
            >
              {epubError && (
                <div className="flex items-center justify-center h-full text-red-500">
                  {epubError}
                </div>
              )}
              {textLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <LoadingTips />
                </div>
              )}
              <div
                ref={viewerRef}
                className="w-full h-full"
                style={{ display: epubError ? "none" : "block" }}
              />
            </div>

            {/* 划线笔记浮动菜单 — 仅登录时可用 */}
            {showHighlightMenu && isLoggedIn && (
              <div
                className="absolute z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800/90 text-white shadow-xl backdrop-blur-sm"
                style={{
                  left: Math.max(10, highlightMenuPos.x - 80),
                  top: Math.max(10, highlightMenuPos.y - 40),
                }}
              >
                {[
                  { color: "#facc15", label: "黄" },
                  { color: "#f87171", label: "红" },
                  { color: "#60a5fa", label: "蓝" },
                  { color: "#4ade80", label: "绿" },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => addHighlight(item.color)}
                    className="w-6 h-6 rounded-full border border-white/30 hover:scale-110 transition-transform"
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  />
                ))}
                <button
                  onClick={() => {
                    setShowHighlightMenu(false);
                    setSelectedRange(null);
                    setSelectedText(null);
                  }}
                  className="ml-1 text-xs text-slate-300 hover:text-white"
                >
                  取消
                </button>
              </div>
            )}

            {/* 翻页按钮 */}
            {!epubError && !textLoading && (
              <>
                <button
                  type="button"
                  onClick={() => renditionRef.current?.prev()}
                  disabled={atStart}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-lg border border-slate-200/50 dark:border-slate-700/50 transition-all z-20 ${
                    atStart
                      ? "opacity-30 cursor-not-allowed"
                      : "opacity-70 hover:opacity-100 hover:scale-110"
                  }`}
                >
                  <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => renditionRef.current?.next()}
                  disabled={atEnd}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-lg border border-slate-200/50 dark:border-slate-700/50 transition-all z-20 ${
                    atEnd
                      ? "opacity-30 cursor-not-allowed"
                      : "opacity-70 hover:opacity-100 hover:scale-110"
                  }`}
                >
                  <ChevronRight className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </button>
              </>
            )}

            {/* 点击区域提示 */}
            {!epubError && !textLoading && (
              <div className="absolute inset-0 pointer-events-none flex">
                <div className="w-[30%]" />
                <div className="flex-1" />
                <div className="w-[30%]" />
              </div>
            )}
          </div>
        )}

        {/* PDF Viewer */}
        {book.format === "pdf" && (
          <div className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            <iframe
              src={book.file_url}
              className="w-full"
              style={{ height: "calc(100vh - 120px)" }}
              title={book.title}
            />
          </div>
        )}

        {/* TXT Viewer */}
        {book.format === "txt" && (
          <>
            {textLoading && <LoadingTips />}
            {!textLoading && textContent && (
              <div
                className={`${
                  settings.theme === "custom" ? "" : t.bg
                } backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-10`}
                style={
                  settings.theme === "custom"
                    ? { backgroundColor: settings.customColor }
                    : undefined
                }
              >
                <div
                  className={`${t.text} max-w-none whitespace-pre-wrap`}
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    fontFamily: settings.fontFamily,
                  }}
                >
                  {textContent.split("\n").map((para, i) => (
                    <p
                      key={i}
                      style={{
                        marginBottom: `${settings.paragraphSpacing}px`,
                      }}
                    >
                      {para.trimStart()}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    );
  }

  // Detail / TOC mode
  return (
    <div
      className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10"
      style={{ maxWidth: "64rem" }}
    >
      <button
        type="button"
        onClick={() => router.push("/novel")}
        className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 书架
      </button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Book Header - 双栏布局：左封面+文字，右精彩摘录 */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-8 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* 左栏：封面 + 书名/作者/章数/描述/按钮 —— 都在这一栏，垂直排列 */}
            <div className="flex flex-col md:flex-row gap-6 flex-1">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-32 h-44 rounded-xl object-cover shadow-lg mx-auto md:mx-0 flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-44 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg mx-auto md:mx-0 flex-shrink-0">
                  <BookOpen className="w-10 h-10 text-white/60" />
                </div>
              )}
              <div className="flex-1 flex gap-4">
                {/* 左侧：书名/作者/章数/按钮 */}
                <div className="text-center md:text-left flex-shrink-0">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {book.title}
                  </h1>
                  {book.author && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                      {book.author}
                    </p>
                  )}
                  <p className="text-sm text-sky-500 dark:text-sky-400 mt-2">
                    共 {chapters.filter((ch) => isRealChapter(ch.title)).length || book.chapter_count || 0} 章
                  </p>
                  {readingProgress && readingProgress.chapterTitle && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      读到：{readingProgress.chapterTitle}
                    </p>
                  )}
                  <div className="flex gap-3 mt-4 justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={() => startReading()}
                      className="px-5 py-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      开始阅读
                    </button>
                    <a
                      href={book.file_url}
                      download
                      className="px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-700/60 border border-slate-200/50 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
                      title="下载"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {/* 右侧：正文简介，与书名顶部对齐，限制行数不溢出 */}
                {excerpt && (
                  <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed min-w-0 flex-1 pt-1 overflow-hidden">
                    <div className="line-clamp-6">{excerpt}</div>
                  </div>
                )}
              </div>
            </div>
            {/* 右栏：精彩摘录卡片（动画轮播） */}
            {excerpts.length > 0 && (
              <div className="lg:w-80 flex-shrink-0">
                <div className="relative h-full min-h-[200px] rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/30 p-5 overflow-hidden">
                  <div className="absolute top-2 left-3 text-5xl text-amber-300/50 dark:text-amber-600/30 font-serif leading-none select-none">"</div>
                  <div className="absolute bottom-2 right-3 text-5xl text-amber-300/50 dark:text-amber-600/30 font-serif leading-none select-none">"</div>
                  <div className="relative flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">精彩摘录</span>
                    {excerpts.length > 1 && (
                      <span className="text-xs text-amber-600/60 dark:text-amber-400/50">{excerptIndex + 1} / {excerpts.length}</span>
                    )}
                  </div>
                  <div className="relative h-[120px] flex items-center">
                    {excerpts.map((s, idx) => (
                      <p
                        key={idx}
                        className={`absolute inset-x-0 text-amber-900 dark:text-amber-100 leading-relaxed font-serif text-[13px] px-2 transition-all duration-700 ease-out ${
                          idx === excerptIndex
                            ? "opacity-100 translate-y-0 blur-none"
                            : "opacity-0 translate-y-4 blur-sm pointer-events-none"
                        }`}
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                  {excerpts.length > 1 && (
                    <div className="relative flex justify-center gap-1.5 mt-2">
                      {excerpts.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            idx === excerptIndex
                              ? "bg-amber-500 w-6"
                              : "bg-amber-300/50 dark:bg-amber-600/30 w-1.5"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chapter List */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            目录
          </h2>
          {chapters.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p>暂无章节信息</p>
              <p className="text-sm mt-1">点击「开始阅读」直接阅读</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {chapters.filter((ch) => isRealChapter(ch.title)).map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => startReading(ch.title)}
                  className="text-left px-4 py-3 rounded-xl bg-white/40 dark:bg-slate-700/40 border border-slate-200/30 dark:border-slate-600/30 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:border-sky-200 dark:hover:border-sky-700 transition-all text-sm text-slate-700 dark:text-slate-300 truncate"
                  title={ch.title}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}