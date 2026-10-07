"use client";

import { useState, useCallback } from "react";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function UuidGeneratorApp() {
  const [uuid, setUuid] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [batchCount, setBatchCount] = useState(1);
  const [batchUuids, setBatchUuids] = useState<string[]>([]);
  const [format, setFormat] = useState<"default" | "upper" | "noDash" | "braces">("default");

  const formatUUID = useCallback(
    (id: string) => {
      switch (format) {
        case "upper":
          return id.toUpperCase();
        case "noDash":
          return id.replace(/-/g, "");
        case "braces":
          return `{${id}}`;
        default:
          return id;
      }
    },
    [format]
  );

  const generate = useCallback(() => {
    if (batchCount > 1) {
      const uuids = Array.from({ length: batchCount }, () => generateUUID());
      setBatchUuids(uuids);
      setUuid(uuids[0]);
      setHistory((h) => [uuids[0], ...h].slice(0, 20));
    } else {
      const id = generateUUID();
      setUuid(id);
      setBatchUuids([]);
      setHistory((h) => [id, ...h].slice(0, 20));
    }
    setCopied(false);
  }, [batchCount]);

  const handleCopy = async (text?: string) => {
    const target = text || formatUUID(uuid);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleCopyAll = async () => {
    if (batchUuids.length === 0) return;
    const text = batchUuids.map((id) => formatUUID(id)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      {/* UUID 显示区 */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3">
        {uuid ? (
          <div className="font-mono text-sm text-slate-900 dark:text-white break-all leading-relaxed select-all text-center">
            {formatUUID(uuid)}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">点击生成 UUID</p>
        )}
      </div>

      {/* 批量 UUID 展示 */}
      {batchUuids.length > 1 && (
        <div className="mb-3 max-h-32 overflow-auto bg-slate-50 dark:bg-slate-800/30 rounded-xl p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400">批量结果</span>
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-[10px] text-indigo-500 font-bold"
            >
              复制全部
            </button>
          </div>
          {batchUuids.map((id, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] text-slate-400 w-5">{i + 1}.</span>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 flex-1 truncate">
                {formatUUID(id)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(formatUUID(id))}
                className="text-[10px] text-indigo-500 font-bold shrink-0"
              >
                复制
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 格式选择 */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { key: "default" as const, label: "默认", desc: "xxxx-xxxx" },
          { key: "upper" as const, label: "大写", desc: "XXXX-XXXX" },
          { key: "noDash" as const, label: "无横线", desc: "xxxxxxxx" },
          { key: "braces" as const, label: "花括号", desc: "{xxxx}" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFormat(opt.key)}
            className={`py-1.5 rounded-lg text-center transition-colors ${
              format === opt.key
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
            }`}
          >
            <div className="text-xs font-bold">{opt.label}</div>
            <div className="text-[8px]">{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* 批量数量 */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mr-1">批量</span>
        {[1, 3, 5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setBatchCount(n)}
            className={`w-6 h-6 rounded-md text-[10px] font-bold transition-colors ${
              batchCount === n
                ? "bg-indigo-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* 生成 & 复制 */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={generate}
          className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors"
        >
          生成 UUID
        </button>
        <button
          type="button"
          onClick={() => handleCopy()}
          disabled={!uuid}
          className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors disabled:opacity-40"
        >
          {copied ? "已复制 ✓" : "复制"}
        </button>
      </div>

      {/* 历史 */}
      {history.length > 0 && (
        <div className="flex-1 overflow-auto border-t border-slate-100 dark:border-slate-800 pt-2">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">历史</div>
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex-1 truncate">
                {formatUUID(h)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(formatUUID(h))}
                className="text-[9px] text-indigo-500"
              >
                复制
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
