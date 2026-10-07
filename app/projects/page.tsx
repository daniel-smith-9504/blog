"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderGit2, ExternalLink } from "lucide-react";
import { getProjects } from "@/app/api";
import type { ProjectItem } from "@/app/api";

const statusLabels: Record<string, string> = {
  developing: "开发中",
  active: "已上线",
  archived: "已归档",
  planned: "计划中",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getProjects()
      .then((data) => {
        // tech_stack 在数据库中是 JSON 字符串，需要解析
        const parsed = data.map((p) => ({
          ...p,
          tech_stack: typeof p.tech_stack === "string"
            ? (() => { try { return JSON.parse(p.tech_stack); } catch { return []; } })()
            : (p.tech_stack || []),
        }));
        setProjects(parsed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (Array.isArray(p.tech_stack) && p.tech_stack.some((t: string) => t.toLowerCase().includes(q)))
    );
  }, [projects, searchQuery]);

  function getProjectLink(p: ProjectItem): string | null {
    return p.link_live || p.link_github || p.link_gitee || null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 relative z-10">
      {/* 页头 */}
      <div className="mb-5 md:mb-10 text-center md:text-left">
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 justify-center md:justify-start">
          <FolderGit2 className="w-5 h-5 md:w-7 md:h-7 text-sky-500" />
          <h1 className="text-xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            项目
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-medium text-xs md:text-sm">
          从零到一，用代码构建的每一份作品
        </p>
      </div>

      {/* 搜索框 */}
      <div className="mb-5 md:mb-10 flex justify-center w-full">
        <div className="relative w-full max-w-lg">
          <input
            type="text"
            placeholder="搜索项目名称、描述或技术栈..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-full px-4 py-2 md:px-6 md:py-3 pl-10 md:pl-12 text-slate-900 dark:text-white font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-slate-500 dark:placeholder-slate-400 text-xs md:text-sm"
          />
          <svg
            className="w-4 h-4 md:w-5 md:h-5 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 md:h-56 rounded-2xl md:rounded-3xl bg-white/30 dark:bg-slate-800/30 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          暂无项目数据
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          <AnimatePresence>
            {filtered.map((project) => {
              const link = getProjectLink(project);
              const techStack = Array.isArray(project.tech_stack) ? project.tech_stack : [];
              const statusLabel = project.status_label || statusLabels[project.status] || project.status;

              return (
                <motion.div
                  layout
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full"
                >
                  <a
                    href={link || "#"}
                    target={link ? "_blank" : undefined}
                    rel={link ? "noopener noreferrer" : undefined}
                    className={`block h-full rounded-2xl md:rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl overflow-hidden transition-all duration-700 hover:scale-[1.01] group relative p-4 md:p-8 ${link ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {/* 装饰性光晕 */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-colors duration-700" />

                    {/* 状态标签 */}
                    {statusLabel && (
                      <span className="absolute top-3 right-3 md:top-4 md:right-4 text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        {statusLabel}
                      </span>
                    )}

                    <div className="flex items-start justify-between mb-3 md:mb-4 relative z-10">
                      <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white pr-16">
                        {project.name}
                      </h2>
                      {/* 链接图标 */}
                      <div className="flex items-center gap-2 md:gap-2.5 flex-shrink-0 absolute top-0 right-0">
                        {link && (
                          <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed line-clamp-3 mb-4 md:mb-6 relative z-10 min-h-[48px] md:min-h-[60px]">
                      {project.description || "暂无描述"}
                    </p>

                    {techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 md:gap-2 relative z-10">
                        {techStack.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[9px] md:text-[10px] font-bold tracking-wider uppercase text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 md:px-3 md:py-1 rounded-md border border-sky-500/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-12 md:py-20 text-slate-600 dark:text-slate-300 font-medium text-xs md:text-sm"
            >
              没有找到匹配 [{searchQuery}] 的项目...
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}