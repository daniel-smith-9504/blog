"use client";

import { useEffect } from "react";

const STORAGE_KEY = "visitor_recorded";
const EXPIRE_HOURS = 24;

function shouldRecord(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    if (isNaN(last)) return true;
    const hours = (Date.now() - last) / (1000 * 60 * 60);
    return hours >= EXPIRE_HOURS;
  } catch {
    return true;
  }
}

export default function VisitorTracker() {
  useEffect(() => {
    // 访客记录（24小时内同一浏览器只记录一次）
    if (shouldRecord()) {
      fetch("/api/visitors/record", {
        method: "POST",
        headers: {
          "x-path": window.location.pathname,
        },
      })
        .then(() => {
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
        })
        .catch(() => {});
    }

    // 获取地理位置，供看板娘欢迎语使用
    if (!sessionStorage.getItem("visitor_location")) {
      fetch("/api/visitors/location")
        .then((r) => r.json())
        .then((res) => {
          if (res.code === 0 && res.data && (res.data.city || res.data.region)) {
            sessionStorage.setItem("visitor_location", JSON.stringify(res.data));
          }
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
