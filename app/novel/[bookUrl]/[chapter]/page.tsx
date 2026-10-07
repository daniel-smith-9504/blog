"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Settings, Minus, Plus, Maximize2, Minimize2, Highlighter, X, Trash2 } from "lucide-react";
import { getBookContent, getChapterList, saveBookProgress } from "@/app/api/novel/novel-api";
import { Chapter, decodeBookUrl, loadSettings, saveSettings, ReadingSettings, defaultSettings } from "../../_lib/utils";
import LoadingTips from "../../_lib/LoadingTips";

interface NoteItem {
  id: number;
  text: string;
  note: string;
  color: string;
  chapter_id?: number | null;
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-200/70 dark:bg-yellow-700/50",
  green: "bg-green-200/70 dark:bg-green-700/50",
  blue: "bg-sky-200/70 dark:bg-sky-700/50",
  pink: "bg-pink-200/70 dark:bg-pink-700/50",
  purple: "bg-purple-200/70 dark:bg-purple-700/50",
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function ReadingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookUrl = decodeBookUrl(params.bookUrl as string);
  const chapterIndex = Number(params.chapter);
  const bookSourceUrl = searchParams.get("source") || "";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [content, setContent] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSettings]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
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
    // 这里使用 bookUrl 作为书籍标识来查询笔记，但 API 需要数字 ID
    // 由于 novel 模块使用的是外部书源，笔记功能暂时用 localStorage 做本地存储
    try {
      const key = `novel_notes_${encodeURIComponent(bookUrl)}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const all = JSON.parse(saved) as NoteItem[];
        setNotes(all.filter((n) => n.chapter_id === chapterIndex));
      } else {
        setNotes([]);
      }
    } catch {
      setNotes([]);
    }
  }, [bookUrl, chapterIndex]);

  const saveNoteLocal = useCallback((note: Omit<NoteItem, "id">) => {
    try {
      const key = `novel_notes_${encodeURIComponent(bookUrl)}`;
      const saved = localStorage.getItem(key);
      const all: NoteItem[] = saved ? JSON.parse(saved) : [];
      const newNote: NoteItem = { ...note, id: Date.now() };
      all.push(newNote);
      localStorage.setItem(key, JSON.stringify(all));
      setNotes((prev) => [...prev, newNote]);
    } catch { /* ignore */ }
  }, [bookUrl]);

  const deleteNoteLocal = useCallback((id: number) => {
    try {
      const key = `novel_notes_${encodeURIComponent(bookUrl)}`;
      const saved = localStorage.getItem(key);
      let all: NoteItem[] = saved ? JSON.parse(saved) : [];
      all = all.filter((n) => n.id !== id);
      localStorage.setItem(key, JSON.stringify(all));
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch { /* ignore */ }
  }, [bookUrl]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [chapterRes, contentRes] = await Promise.all([
          getChapterList(bookUrl, bookSourceUrl),
          getBookContent(bookUrl, chapterIndex),
        ]);
        if (chapterRes.isSuccess) {
          setChapters(chapterRes.data);
          setChapterTitle(chapterRes.data[chapterIndex]?.title || "");
        }
        if (contentRes.isSuccess) {
          setContent(contentRes.data);
          window.scrollTo(0, 0);
          saveBookProgress(bookUrl, chapterIndex);
        } else {
          setError(contentRes.errorMsg || "获取内容失败");
        }
      } catch {
        setError("网络错误");
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchNotes();
  }, [bookUrl, chapterIndex, bookSourceUrl, fetchNotes]);

  // 监听文本选择
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const sel = window.getSelection();
      const text = sel?.toString()?.trim() || "";
      if (text.length > 0 && text.length < 500 && contentRef.current?.contains(sel?.anchorNode as Node)) {
        setSelection({ text, x: e.clientX, y: e.clientY });
      } else {
        setSelection(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const goToChapter = (index: number) => {
    router.push(`/novel/${params.bookUrl}/${index}?source=${encodeURIComponent(bookSourceUrl)}`);
  };

  const goChapter = (dir: -1 | 1) => {
    const newIndex = chapterIndex + dir;
    if (newIndex >= 0 && newIndex < chapters.length) {
      goToChapter(newIndex);
    }
  };

  const handleHighlight = (color: string) => {
    if (!selection) return;
    saveNoteLocal({ text: selection.text, note: "", color, chapter_id: chapterIndex });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const themes: Record<string, { bg: string; text: string }> = {
    default: { bg: "bg-white/60 dark:bg-slate-800/60", text: "text-slate-800 dark:text-slate-200" },
    sepia: { bg: "bg-amber-50/80 dark:bg-amber-900/30", text: "text-amber-900 dark:text-amber-100" },
    green: { bg: "bg-emerald-50/80 dark:bg-emerald-900/30", text: "text-emerald-900 dark:text-emerald-100" },
  };
  const t = themes[settings.theme] || themes.default;

  // 将笔记高亮应用到内容中
  const renderHighlightedContent = (text: string) => {
    let html = escapeHtml(text);
    // 按文本长度降序，避免短文本替换干扰长文本
    const sortedNotes = [...notes].sort((a, b) => b.text.length - a.text.length);
    for (const note of sortedNotes) {
      const escaped = escapeHtml(note.text);
      const colorClass = HIGHLIGHT_COLORS[note.color] || HIGHLIGHT_COLORS.yellow;
      html = html.replace(
        escaped,
        `<mark class="${colorClass} rounded px-0.5 cursor-pointer" data-note-id="${note.id}">${escaped}</mark>`
      );
    }
    return html;
  };

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return (
    <div
      className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12"
      style={{ maxWidth: settings.contentWidth === "narrow" ? "42rem" : settings.contentWidth === "wide" ? "72rem" : settings.contentWidth === "full" ? "100%" : "56rem" }}
    >
      <button type="button" onClick={() => router.push(`/novel/${params.bookUrl}?source=${encodeURIComponent(bookSourceUrl)}`)} className="flex items-center gap-2 text-slate-500 hover:text-sky-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> 目录
      </button>

      {loading && <LoadingTips />}

      {error && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {!loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white text-center flex-1 px-4 truncate">{chapterTitle}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => goChapter(-1)} disabled={chapterIndex <= 0} title="上一章"
                className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => goChapter(1)} disabled={chapterIndex >= chapters.length - 1} title="下一章"
                className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => { setShowNotes((v) => !v); if (!showNotes) fetchNotes(); }} title="笔记"
                className={`p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors ${showNotes ? "bg-sky-500 text-white" : "bg-white/60 dark:bg-slate-800/60 text-slate-500 hover:text-sky-500"}`}>
                <Highlighter className="w-4 h-4" />
              </button>
              <button type="button" onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}
                className="p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 text-slate-500 hover:text-sky-500 transition-colors">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button type="button" onMouseDown={(e) => { e.stopPropagation(); setShowSettings((v) => !v); }} title="阅读设置"
                className={`p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors ${showSettings ? "bg-sky-500 text-white" : "bg-white/60 dark:bg-slate-800/60 text-slate-500 hover:text-sky-500"}`}>
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 笔记侧边栏 */}
          <AnimatePresence>
            {showNotes && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="absolute right-0 top-14 z-40 w-72 p-3 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-xl max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">本章笔记</span>
                  <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
                {notes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">选中文本后点击「划线」即可添加笔记</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n) => (
                      <div key={n.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/30">
                        <p className={`text-xs mb-1 rounded px-1 inline-block ${HIGHLIGHT_COLORS[n.color] || HIGHLIGHT_COLORS.yellow}`}>{n.text}</p>
                        {n.note && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.note}</p>}
                        <div className="flex justify-end mt-1">
                          <button onClick={() => deleteNoteLocal(n.id)} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3" /> 删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 设置面板 */}
          {showSettings && (
            <div ref={settingsRef} className="absolute right-4 top-16 z-50 w-80 p-4 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-xl space-y-4">
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
                  {[["serif", "宋体"], ["sans-serif", "黑体"], ["system-ui", "系统"]].map(([val, label]) => (
                    <button key={val} onClick={() => updateSetting("fontFamily", val)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.fontFamily === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">背景</span>
                  <div className="flex gap-2">
                    {[["default", "默认"], ["sepia", "护眼"], ["green", "绿意"], ["custom", "自定义"]].map(([val, label]) => (
                      <button key={val} onClick={() => updateSetting("theme", val)}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.theme === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                        {label}
                      </button>
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
                  {[["narrow", "窄"], ["normal", "标准"], ["wide", "宽"], ["full", "全屏"]].map(([val, label]) => (
                    <button key={val} onClick={() => updateSetting("contentWidth", val)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${settings.contentWidth === val ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 浮动划线工具栏 */}
          <AnimatePresence>
            {selection && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="fixed z-50 flex items-center gap-1 p-1.5 rounded-lg bg-slate-800 text-white shadow-xl"
                style={{ left: Math.min(selection.x, window.innerWidth - 200), top: selection.y - 48 }}
              >
                <span className="text-xs px-2 text-slate-300 max-w-[120px] truncate">{selection.text.slice(0, 10)}{selection.text.length > 10 ? "…" : ""}</span>
                {Object.entries(HIGHLIGHT_COLORS).map(([color, cls]) => (
                  <button key={color} onClick={() => handleHighlight(color)} title={color}
                    className={`w-6 h-6 rounded-full border-2 border-white/30 ${cls.replace(/dark:[^ ]+/g, "").replace(/bg-/, "bg-")}`}
                    style={{ backgroundColor: color === "yellow" ? "#fde047" : color === "green" ? "#86efac" : color === "blue" ? "#7dd3fc" : color === "pink" ? "#f9a8d4" : "#d8b4fe" }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`${settings.theme === "custom" ? "" : t.bg} backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 md:p-10`}
            style={settings.theme === "custom" ? { backgroundColor: settings.customColor } : undefined}
          >
            <div
              ref={contentRef}
              className={`${t.text} max-w-none whitespace-pre-wrap`}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                fontFamily: settings.fontFamily,
              }}
              dangerouslySetInnerHTML={{
                __html: content.split("\n").map((para, i) =>
                  `<p style="margin-bottom:${settings.paragraphSpacing}px">${renderHighlightedContent(para.trimStart())}</p>`
                ).join(""),
              }}
            />
          </div>
          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => goChapter(-1)} disabled={chapterIndex <= 0}
              className="px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 text-sm">上一章</button>
            <span className="text-sm text-slate-500">{chapterIndex + 1} / {chapters.length}</span>
            <button type="button" onClick={() => goChapter(1)} disabled={chapterIndex >= chapters.length - 1}
              className="px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 text-sm">下一章</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
