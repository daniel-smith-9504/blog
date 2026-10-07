"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/siteConfig";

function parseLrc(lrcText: string) {
  if (!lrcText || lrcText.length > 30000) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: { time: number; text: string }[] = [];
  for (const line of lines) {
    const matches = [...line.matchAll(/\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    if (matches.length > 0) {
      const text = line
        .replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, "")
        .replace(/[-\u001f\u007f-\u009f\u200b-\u200d\ufeff]/g, "")
        .trim();
      if (text) {
        for (const match of matches) {
          const min = parseInt(match[1]);
          const sec = parseInt(match[2]);
          const ms = match[3] ? parseInt(match[3]) : 0;
          const divisor = match[3] && match[3].length === 3 ? 1000 : 100;
          result.push({ time: min * 60 + sec + ms / divisor, text });
        }
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

type PlayMode = "loop" | "single" | "random";
type SongType = "netease" | "local";

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrcUrl: string;
  lyrics: { time: number; text: string }[];
  type: SongType;
  dbId?: number;
}

interface MusicContextType {
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | undefined;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  currentLyric: string;
  allLyrics: { time: number; text: string }[];
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  playMode: PlayMode;
  saying: string;
  refreshSaying: () => void;
  refreshPlaylist: () => Promise<void>;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  handleSeek: (value: number) => void;
  playSong: (index: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  togglePlayMode: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const [currentLyric, setCurrentLyric] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("loop");
  const [saying, setSaying] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const playModeRef = useRef(playMode);
  const nextSongRef = useRef<() => void>(() => {});
  const fetchIdRef = useRef(0);
  // 用 ref 保存当前 playlist，避免 fetchMusicData 依赖它导致引用变化引发无限重取
  const playlistRef = useRef<Song[]>([]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  const pathname = usePathname();

  // Fetch saying once on mount
  const refreshSaying = useCallback(() => {
    fetch("https://uapis.cn/api/v1/saying")
      .then((r) => r.json())
      .then((d) => { if (d?.text) setSaying(d.text); })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshSaying(); }, [refreshSaying]);

  // 实际的拉取逻辑：被初次 mount / refreshPlaylist / 进入 /music 路由 三处复用
  const fetchMusicData = useCallback(async (opts?: { silent?: boolean }) => {
    const myId = ++fetchIdRef.current;
    if (!opts?.silent) setIsLoading(true);
    // 首屏非静默拉取 8 秒还没回来，强制解除 loading，避免 Meting/外网挂掉时永远卡住
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    if (!opts?.silent) {
      safetyTimer = setTimeout(() => {
        if (myId === fetchIdRef.current) setIsLoading(false);
      }, 8000);
    }
    try {
      // 优先从 API 获取动态配置，回退到静态 siteConfig
      let playlistId = siteConfig.cloudMusicPlaylistId;
      let musicIds: string[] = siteConfig.cloudMusicIds as string[];
      try {
        const configRes = await fetch("/api/site-config", { cache: "no-store" });
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.cloudMusicPlaylistId) {
            playlistId = config.cloudMusicPlaylistId;
          }
          if (config.cloudMusicIds) {
            try {
              const parsed = JSON.parse(config.cloudMusicIds);
              if (Array.isArray(parsed) && parsed.length > 0) musicIds = parsed;
            } catch { /* ignore */ }
          }
        }
      } catch { /* 用静态配置回退 */ }

      let apiUrl = "/api/music";
      const params = new URLSearchParams();
      if (playlistId) params.set("id", playlistId);
      else if (musicIds?.length > 0) params.set("ids", musicIds.join(","));
      // 始终附加时间戳，避免浏览器/CDN 缓存拿到旧的歌单
      params.set("_t", String(Date.now()));
      const qs = params.toString();
      if (qs) apiUrl += `?${qs}`;

      const res = await fetch(apiUrl, { cache: "no-store" });
      const data = await res.json();

      const songs = (Array.isArray(data) ? data : [])
        .map((r: Record<string, unknown>) => ({
          id: String(r.id || Math.random()),
          title: String(r.title || r.name || "未知歌曲"),
          artist: String(r.artist || r.author || "未知歌手"),
          cover: String(r.cover || r.pic || ""),
          src: String(r.src || r.url || ""),
          lrcUrl: String(r.lrcUrl || r.lrc || ""),
          lyrics: [] as { time: number; text: string }[],
          type: (r.type as SongType) || "netease" as SongType,
          dbId: r.dbId as number | undefined,
        }))
        .filter((s) => s.src);

      // 若本轮拉取被更新的请求取代，丢弃旧结果
      if (myId !== fetchIdRef.current) return;

      // 关键：直接覆盖 playlist（而不是只在空时写入）
      if (songs.length > 0) {
        setPlaylist(songs);
        // 当前播放的歌如果还在新列表里，保留索引；否则重置到第一首
        setCurrentIndex((prev) => {
          const stillExists = songs.findIndex((s) => s.id === playlistRef.current[prev]?.id);
          return stillExists >= 0 ? stillExists : 0;
        });
      } else {
        setPlaylist([]);
        setCurrentIndex(0);
      }
    } catch {
      // 静默失败：保持原列表不变
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (myId === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  // 初次加载
  useEffect(() => {
    fetchMusicData();
  }, [fetchMusicData]);

  // 进入 /music 路由时强制刷新一次（解决后台改了歌单，前台不刷新的问题）
  useEffect(() => {
    if (pathname && pathname.startsWith("/music")) {
      fetchMusicData({ silent: true });
    }
  }, [pathname, fetchMusicData]);

  // 暴露给外部的手动刷新（UI 上可加按钮）
  const refreshPlaylist = useCallback(async () => {
    await fetchMusicData({ silent: true });
  }, [fetchMusicData]);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (playlist.length === 0) return;
    const song = playlist[currentIndex];
    if (!song) return;
    let mounted = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally reset on song change only
    setLyrics([]);
    setCurrentLyric("");

    if (song.lrcUrl) {
      fetch(song.lrcUrl)
        .then((r) => r.text())
        .then((text) => {
          if (!mounted) return;
          const parsed = parseLrc(text);
          setLyrics(parsed);
          setPlaylist((prev) => {
            const next = [...prev];
            next[currentIndex] = { ...next[currentIndex], lyrics: parsed };
            return next;
          });
        })
        .catch(() => {});
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isPlaying only used for auto-play, lyrics should not re-fetch
  }, [currentIndex, playlist.length]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const nextSong = useCallback(() => {
    if (playMode === "random") {
      setCurrentIndex(Math.floor(Math.random() * playlist.length));
    } else {
      setCurrentIndex((p) => (p + 1) % playlist.length);
    }
  }, [playMode, playlist.length]);

  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { nextSongRef.current = nextSong; }, [nextSong]);

  const prevSong = useCallback(() => {
    if (playMode === "random") {
      setCurrentIndex(Math.floor(Math.random() * playlist.length));
    } else {
      setCurrentIndex((p) => (p - 1 + playlist.length) % playlist.length);
    }
  }, [playMode, playlist.length]);

  const playSong = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);
    setProgress(dur > 0 ? (ct / dur) * 100 : 0);
    if (lyrics.length > 0) {
      const active = [...lyrics].reverse().find((l) => ct >= l.time);
      if (active) setCurrentLyric(active.text);
    }
  }, [lyrics]);

  const handleEnded = useCallback(() => {
    if (playModeRef.current === "single" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      nextSongRef.current();
    }
  }, []);

  const handleSeek = useCallback((value: number) => {
    setProgress(value);
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (value / 100) * audioRef.current.duration;
    }
  }, []);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    if (isMuted && val > 0) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => setIsMuted((p) => !p), []);

  const togglePlayMode = useCallback(() => {
    setPlayMode((p) => (p === "loop" ? "single" : p === "single" ? "random" : "loop"));
  }, []);

  return (
    <MusicContext.Provider
      value={{
        playlist, currentIndex, currentSong: playlist[currentIndex],
        isPlaying, progress, currentTime, duration,
        currentLyric, allLyrics: lyrics, isLoading,
        volume, isMuted, playMode, saying, refreshSaying, refreshPlaylist,
        togglePlay, nextSong, prevSong, handleSeek, playSong,
        setVolume, toggleMute, togglePlayMode,
      }}
    >
      {children}
      {playlist[currentIndex] && (
        <audio
          key={playlist[currentIndex].id}
          ref={audioRef}
          src={playlist[currentIndex].src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleTimeUpdate}
        />
      )}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
