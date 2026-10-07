"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, BookOpen } from "lucide-react";
import LoadingTips from "./_lib/LoadingTips";

interface BookItem {
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

interface BookCategory {
  id: number;
  name: string;
  slug: string;
  _count: { books: number };
}

interface ReadingProgressItem {
  book_id: number;
  chapter_title: string;
}

const filterTabs = [
  { key: "all", label: "全部" },
  { key: "title", label: "精准" },
  { key: "author", label: "作者" },
];

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [progressMap, setProgressMap] = useState<Map<number, string>>(new Map());

  const fetchBooks = useCallback(async (q?: string, catId?: number | null) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (catId) params.set("category_id", String(catId));
      params.set("page_size", "100");

      const res = await fetch(`/api/books?${params}`);
      if (!res.ok) throw new Error("请求失败");
      const data = await res.json();

      setCategories(data.categories || []);
      setBooks(data.books || []);

      // Fetch reading progress for each book
      const bookIds: number[] = (data.books || []).map((b: BookItem) => b.id);
      if (bookIds.length > 0) {
        const progressRes = await fetch(`/api/books/progress/list?ids=${bookIds.join(",")}`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const map = new Map<number, string>();
          (progressData.progresses || []).forEach((p: ReadingProgressItem) => {
            if (p.chapter_title) map.set(p.book_id, p.chapter_title);
          });
          setProgressMap(map);
        }
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSearch = () => {
    fetchBooks(searchQuery.trim(), activeCategory);
  };

  const handleCategoryClick = (catId: number | null) => {
    setActiveCategory(catId);
    fetchBooks(searchQuery.trim(), catId);
  };

  const goToBook = (bookId: number) => {
    router.push(`/novel/${bookId}`);
  };

  const displayedBooks = books.filter((book) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    if (activeFilter === "title") return book.title.toLowerCase().includes(q);
    if (activeFilter === "author") return book.author.toLowerCase().includes(q);
    return (
      book.title.toLowerCase().includes(q) ||
      book.author.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10" style={{ maxWidth: "64rem" }}>
      {loading && <LoadingTips />}

      {error && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {!loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Search */}
          <div className="mb-6 max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="搜索小说..."
                className="w-full px-5 py-3 pr-14 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-sky-400 dark:focus:border-sky-500 transition-colors shadow-sm"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors flex items-center justify-center shadow-md"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === tab.key
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-white/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-sky-100 dark:hover:bg-sky-900/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <button
                type="button"
                onClick={() => handleCategoryClick(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeCategory === null
                    ? "bg-slate-800 text-white"
                    : "bg-white/40 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-slate-800 text-white"
                      : "bg-white/40 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Book Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => goToBook(book.id)}
                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-500 cursor-pointer group p-4"
              >
                <div className="flex gap-4">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-20 h-28 rounded-lg object-cover flex-shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-white text-xs font-medium text-center leading-tight line-clamp-3 px-1">
                        {book.title}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {book.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {book.author || "未知作者"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {progressMap.get(book.id) && (
                        <p className="text-xs text-sky-500 dark:text-sky-400">
                          读到：{progressMap.get(book.id)}
                        </p>
                      )}
                      <p className="text-xs text-sky-500 dark:text-sky-400">
                        共 {book.chapter_count || "?"} 章
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {displayedBooks.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>书架空空如也</p>
              <p className="text-sm mt-2">
                去后台「图书馆管理」上传你的第一本书吧
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
