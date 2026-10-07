"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fallbackQuotes = [
  "人生如逆旅，我亦是行人。",
  "愿你出走半生，归来仍是少年。",
  "世间所有的相遇，都是久别重逢。",
  "星光不问赶路人，时光不负有心人。",
  "生活明朗，万物可爱。",
  "凡是过往，皆为序章。",
  "山高路远，看世界，也找自己。",
  "追风赶月莫停留，平芜尽处是春山。",
  "岁月不居，时节如流。",
  "愿你遍历山河，觉得人间值得。",
  "且将新火试新茶，诗酒趁年华。",
  "人生没有白走的路，每一步都算数。",
  "万物皆有裂痕，那是光照进来的地方。",
  "从此山水不相逢，莫道彼此长和短。",
  "一蓑烟雨任平生。",
  "浮生若梦，为欢几何。",
  "愿你在冷铁卷刃前，得以窥见天光。",
  "世事漫随流水，算来一梦浮生。",
  "行到水穷处，坐看云起时。",
  "人间有味是清欢。",
  "愿你被这个世界温柔以待。",
  "纵使晴明无雨色，入云深处亦沾衣。",
  "人生到处知何似，应似飞鸿踏雪泥。",
  "不畏将来，不念过往。",
  "愿你以渺小启程，以伟大结束。",
  "来日可期，前程似锦。",
  "山有木兮木有枝，心悦君兮君不知。",
  "海内存知己，天涯若比邻。",
  "长风破浪会有时，直挂云帆济沧海。",
  "落霞与孤鹜齐飞，秋水共长天一色。",
  "采菊东篱下，悠然见南山。",
  "明月松间照，清泉石上流。",
  "但愿人长久，千里共婵娟。",
  "天生我材必有用，千金散尽还复来。",
  "莫愁前路无知己，天下谁人不识君。",
  "会当凌绝顶，一览众山小。",
  "沉舟侧畔千帆过，病树前头万木春。",
  "山重水复疑无路，柳暗花明又一村。",
  "千磨万击还坚劲，任尔东西南北风。",
  "纸上得来终觉浅，绝知此事要躬行。",
  "问渠那得清如许？为有源头活水来。",
  "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。",
  "也无风雨也无晴。",
  "心若向阳，无畏悲伤。",
  "凡是打不倒你的，终将使你更强大。",
  "慢品人间烟火色，闲观万事岁月长。",
  "且行且珍惜。",
  "面朝大海，春暖花开。",
  "愿有人问你粥可温，有人与你立黄昏。",
  "岁月静好，现世安稳。",
];

function getRandomFallback() {
  return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
}

export default function DogDiary() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      // 先尝试一言 API（哲学 + 文学类）
      const res = await fetch(
        "https://v1.hitokoto.cn?c=k&c=d&encode=json",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("api failed");
      const json = await res.json();
      if (json && json.hitokoto) {
        setText(json.hitokoto);
        const fromWho = json.from_who ? `${json.from_who} · ` : "";
        const from = json.from || "";
        setSource(fromWho + from);
      } else {
        throw new Error("invalid data");
      }
    } catch {
      // API 失败时降级到内置语录
      setText(getRandomFallback());
      setSource("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // 自动轮播：每 12 秒换一句，弹窗打开时暂停
  useEffect(() => {
    if (showModal) return;
    const timer = setInterval(() => {
      fetchQuote();
    }, 12000);
    return () => clearInterval(timer);
  }, [showModal, fetchQuote]);

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="w-full h-[160px] md:h-[220px] rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-3 md:p-6 flex flex-col justify-between transition-all duration-700 hover:scale-[1.01] cursor-pointer group overflow-hidden"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-pink-500 dark:text-pink-400 tracking-widest uppercase bg-pink-50 dark:bg-pink-900/30 px-2 py-0.5 rounded-sm shadow-sm">
              人间一日游
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fetchQuote();
              }}
              title="换一句"
              className="p-1.5 rounded-lg text-slate-400 hover:text-pink-500 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed line-clamp-5 transition-colors duration-700">
            {loading ? "正在人间漫步..." : text}
          </p>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 self-end">
          点击查看全文
        </p>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md glass-card p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  人间一日游
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  title="关闭"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-2">
                {loading ? "正在人间漫步..." : text}
              </p>
              {source && !loading && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 text-right">
                  —— {source}
                </p>
              )}
              {!source && !loading && <div className="mb-6" />}
              <button
                type="button"
                onClick={fetchQuote}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-pink-500 text-white font-bold text-sm hover:bg-pink-600 transition-colors disabled:opacity-50"
              >
                {loading ? "正在人间漫步..." : "换一句"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
