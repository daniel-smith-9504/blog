"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface SearchBarProps {
  onSearch?: (keyword: string) => void;
  initialValue?: string;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  initialValue = "",
  placeholder = "输入暗号探索更多...",
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit() {
    const keyword = value.trim();

    // 保留彩蛋：输入 5201314 解锁秘密花园
    if (keyword === "5201314") {
      localStorage.setItem("garden-unlock", "true");
      router.push("/garden");
      setValue("");
      return;
    }

    // 输入 20130825 跳转到后台管理
    if (keyword === "20130825") {
      router.push("/admin");
      setValue("");
      return;
    }

    onSearch?.(keyword);
  }

  function handleClear() {
    setValue("");
    onSearch?.("");
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        className="relative group"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className="w-full pl-14 pr-12 py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 transition-all placeholder-slate-500 dark:placeholder-slate-400 font-medium text-lg"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="absolute inset-y-0 left-0 pl-5 flex items-center z-10 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-5 flex items-center z-10 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="清空搜索"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </form>
    </div>
  );
}
