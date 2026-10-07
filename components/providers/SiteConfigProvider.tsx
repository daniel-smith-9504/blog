"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

export type SiteConfigContextType = {
  config: Record<string, string>;
  loading: boolean;
  refreshConfig: () => Promise<void>;
};

const SiteConfigContext = createContext<SiteConfigContextType>({
  config: {},
  loading: true,
  refreshConfig: async () => {},
});

export function SiteConfigProvider({
  children,
  initialConfig = {},
}: {
  children: React.ReactNode;
  initialConfig?: Record<string, string>;
}) {
  const [config, setConfig] = useState<Record<string, string>>(initialConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      // 添加时间戳防止 CDN 或代理的 URL 级别缓存
      const res = await fetch(`/api/site-config?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        console.warn("[SiteConfig] API 返回非 200 状态:", res.status);
        return;
      }
      const data = await res.json();
      if (typeof data === "object" && data !== null && !Array.isArray(data)) {
        // 检查是否真的返回了配置数据（至少有一个键）
        const keys = Object.keys(data);
        if (keys.length > 0) {
          setConfig(data);
        } else {
          console.warn("[SiteConfig] API 返回空对象，保留当前配置");
        }
      } else {
        console.warn("[SiteConfig] API 返回格式异常:", typeof data);
      }
    } catch (err) {
      console.warn("[SiteConfig] 拉取配置失败:", err);
    }
  }, []);

  const refreshConfig = useCallback(async () => {
    setLoading(true);
    await fetchConfig();
    setLoading(false);
  }, [fetchConfig]);

  useEffect(() => {
    // 页面挂载时拉取一次
    fetchConfig().finally(() => setLoading(false));

    // 页面切换回前台时自动刷新（后台修改配置后切回页面就生效）
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchConfig();
      }
    };
    // 窗口获得焦点时刷新（覆盖部分浏览器行为）
    const handleFocus = () => {
      fetchConfig();
    };
    // 从 bfcache 恢复时刷新（移动端返回/前进时常见）
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        fetchConfig();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    // 定时轮询：每 15 秒拉取一次，覆盖同标签页内从后台导航到前台的情况
    const interval = setInterval(fetchConfig, 15_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      clearInterval(interval);
    };
  }, [fetchConfig]);

  return (
    <SiteConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

export function useConfigValue(key: string, defaultValue = ""): string {
  const { config } = useContext(SiteConfigContext);
  return config[key] ?? defaultValue;
}

/** 从站点配置读取 JSON 数组（如 bgImages、themeColors），解析失败返回 fallback */
export function useConfigJson<T>(key: string, fallback: T): T {
  const raw = useConfigValue(key, "");
  return useMemo(() => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T;
    } catch {
      // ignore
    }
    return fallback;
  }, [raw, fallback]);
}
