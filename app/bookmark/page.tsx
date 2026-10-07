"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ExternalLink, Search, X } from "lucide-react";
import { getBookmarks } from "@/app/api";
import type { BookmarkCategory, BookmarkSite } from "@/app/api";

function getIcon(site: BookmarkSite): string {
  if (site.icon) return site.icon;
  try {
    const origin = new URL(site.url).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return "";
  }
}

export default function BookmarkPage() {
  const [data, setData] = useState<BookmarkCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const catRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    getBookmarks()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // 按搜索词过滤
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.trim().toLowerCase();
    return data
      .map((cat) => ({
        ...cat,
        sites: cat.sites.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description || "").toLowerCase().includes(q) ||
            (s.platforms || []).some((p) => p.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.sites.length > 0);
  }, [data, searchQuery]);

  const totalSites = useMemo(
    () => data.reduce((sum, cat) => sum + cat.sites.length, 0),
    [data]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 relative z-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 md:mb-10"
      >
        <div className="flex items-center gap-3">
          <Bookmark className="w-7 h-7 md:w-8 md:h-8 text-sky-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
            收藏夹
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-2 ml-10 md:ml-11 text-sm md:text-base">
          收集常用的好用站点和工具{totalSites > 0 ? `  ·  共 ${totalSites} 个站点` : ""}
        </p>
      </motion.div>

      {/* 分类快捷导航 */}
      {!loading && !error && data.length > 1 && !searchQuery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 md:mb-8 flex flex-wrap gap-1.5 md:gap-2"
        >
          {data.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                const el = catRefs.current[cat.id];
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveCat(cat.id);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
                activeCat === cat.id
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                  : "bg-white/30 dark:bg-slate-800/30 border border-white/40 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300/40"
              }`}
            >
              {cat.name}
              <span className="ml-1 opacity-50 text-[10px]">{cat.sites.length}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* 搜索栏 */}
      {!loading && !error && totalSites > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索站点名称、描述或平台..."
              className="w-full pl-9 pr-8 py-2 md:py-2.5 rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-white/40 dark:border-white/10 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/30 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200/60 dark:bg-slate-600/60 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-slate-400 mt-2 ml-1">
              找到 {filtered.reduce((s, c) => s + c.sites.length, 0)} 个匹配站点
            </p>
          )}
        </motion.div>
      )}

      {/* Loading 骨架屏 */}
      {loading && (
        <div className="space-y-10">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-5 w-24 bg-slate-200/50 dark:bg-slate-700/50 rounded animate-pulse" />
                <div className="h-4 w-6 bg-slate-200/50 dark:bg-slate-700/50 rounded-full animate-pulse" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="h-14 rounded-xl bg-white/20 dark:bg-slate-800/20 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm mb-4">加载失败，请刷新重试</p>
          <button
            onClick={() => {
              setError(false);
              setLoading(true);
              getBookmarks()
                .then(setData)
                .catch(() => setError(true))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 rounded-full bg-sky-500/10 text-sky-600 text-sm font-medium hover:bg-sky-500/20 transition-colors border border-sky-500/20"
          >
            重新加载
          </button>
        </div>
      )}

      {/* 空数据 */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-20">
          <Bookmark className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 text-sm">暂无收藏，请先在后台添加站点</p>
        </div>
      )}

      {/* 分类列表 */}
      {!loading && !error && data.length > 0 && (
        <div className="space-y-10 md:space-y-14">
          <AnimatePresence>
            {filtered.map((category, catIndex) => (
              <motion.section
                key={category.id}
                ref={(el) => { catRefs.current[category.id] = el as HTMLElement | null; }}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, delay: catIndex * 0.08 }}
              >
                {/* 分类标题 */}
                <div className="flex items-center gap-2.5 mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                    {category.name}
                  </h2>
                  <span className="text-xs text-slate-400 bg-slate-100/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                    {category.sites.length}
                  </span>
                </div>
                {category.description && (
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-4 -mt-2">
                    {category.description}
                  </p>
                )}

                {/* 站点卡片网格 */}
                <motion.div
                  layout
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {category.sites.map((site, siteIndex) => (
                    <motion.a
                      key={site.id}
                      layout
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.25,
                        delay: siteIndex * 0.02,
                      }}
                      className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-white/40 dark:border-white/10 hover:border-sky-300/60 dark:hover:border-sky-600/40 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-300 cursor-pointer"
                    >
                      {/* 图标 */}
                      <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-100/60 dark:bg-slate-700/40 flex items-center justify-center">
                        <img
                          src={getIcon(site)}
                          alt={site.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const t = e.currentTarget;
                            t.style.display = "none";
                            const span = t.nextElementSibling as HTMLElement;
                            if (span) span.style.display = "flex";
                          }}
                        />
                        <span
                          className="text-sm font-bold text-sky-500 items-center justify-center hidden"
                        >
                          {site.name[0]}
                        </span>
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0 pr-5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {site.name}
                          </h3>
                        </div>
                        {(site.description || site.platforms?.length) ? (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {site.description && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                                {site.description}
                              </span>
                            )}
                            {site.platforms?.length > 0 && (
                              <span className="text-[9px] font-medium tracking-wider text-sky-500/60 bg-sky-500/5 px-1.5 py-px rounded">
                                {site.platforms.slice(0, 3).join(" · ")}
                                {site.platforms.length > 3 ? ` +${site.platforms.length - 3}` : ""}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* 外链图标 — hover 显示 */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                      </div>
                    </motion.a>
                  ))}
                </motion.div>
              </motion.section>
            ))}
          </AnimatePresence>

          {/* 搜索无结果 */}
          {searchQuery && filtered.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-400 text-sm">
                没有找到匹配 「{searchQuery}」 的站点
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}