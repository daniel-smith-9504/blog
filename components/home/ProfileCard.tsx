"use client";

import { useEffect, useState } from "react";
import { useConfigValue } from "@/components/providers/SiteConfigProvider";
import { siteConfig } from "@/siteConfig";

interface ProfileStats {
  postCount: number;
  chatterCount: number;
  photoCount: number;
}

export default function ProfileCard({
  postCount: initialPost = 0,
  chatterCount: initialChatter = 0,
  photoCount: initialPhoto = 0,
}: {
  postCount?: number;
  chatterCount?: number;
  photoCount?: number;
}) {
  const avatarUrl = useConfigValue("avatarUrl", siteConfig.avatarUrl);
  const websiteUrl = useConfigValue("websiteUrl", siteConfig.websiteUrl);
  const authorName = useConfigValue("authorName", siteConfig.authorName);
  const bio = useConfigValue("bio", siteConfig.bio);
  const github = useConfigValue("social_github", siteConfig.social?.github);
  const bilibili = useConfigValue("social_bilibili", siteConfig.social?.bilibili);
  const email = useConfigValue("social_email", siteConfig.social?.email);
  const x = useConfigValue("social_x", siteConfig.social?.x);
  const youtube = useConfigValue("social_youtube", siteConfig.social?.youtube);

  // 客户端定期拉取最新统计，覆盖服务端渲染的初始值（Next.js 默认会缓存 server component 结果）
  const [stats, setStats] = useState<ProfileStats>({
    postCount: initialPost,
    chatterCount: initialChatter,
    photoCount: initialPhoto,
  });
  const [statsTick, setStatsTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const r = await fetch("/api/dashboard/profile-stats?_t=" + Date.now(), {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        if (d && typeof d === "object") {
          setStats({
            postCount: Number(d.postCount ?? initialPost),
            chatterCount: Number(d.chatterCount ?? initialChatter),
            photoCount: Number(d.photoCount ?? initialPhoto),
          });
        }
      } catch {
        // ignore
      }
    }
    fetchStats();
    // 30 秒刷新一次，保证后台增删后前台数字会跟新
    const timer = setInterval(() => {
      setStatsTick((t) => t + 1);
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsTick]);

  const postCount = stats.postCount;
  const chatterCount = stats.chatterCount;
  const photoCount = stats.photoCount;

  return (
    <div
      className="rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-5 md:p-8 flex flex-col justify-between transition-all duration-700 group relative overflow-hidden w-full h-full min-h-[200px] md:min-h-[280px]"
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex-shrink-0">
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={websiteUrl}
              >
                <AvatarBlock avatarUrl={avatarUrl} />
              </a>
            ) : (
              <AvatarBlock avatarUrl={avatarUrl} />
            )}
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1 md:mb-2 tracking-wider transition-colors duration-700">
              {authorName}
            </h1>
            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-w-md transition-colors duration-700">
              {bio}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-end md:items-center justify-between mt-4 md:mt-8 gap-4 md:gap-6 relative z-10">
        <div className="flex gap-6 w-full md:w-auto justify-around md:justify-start">
          <StatItem
            count={postCount}
            label="文章"
            color="text-indigo-600 dark:text-indigo-400"
          />
          <div className="w-px h-10 bg-slate-300/50 dark:bg-slate-700 hidden md:block" />
          <StatItem
            count={chatterCount}
            label="说说"
            color="text-purple-600 dark:text-purple-400"
          />
          <div className="w-px h-10 bg-slate-300/50 dark:bg-slate-700 hidden md:block" />
          <StatItem
            count={photoCount}
            label="照片"
            color="text-pink-600 dark:text-pink-400"
          />
        </div>

        <div className="flex gap-3 flex-wrap justify-end">
          {github && <SocialBtn type="github" url={github} />}
          {bilibili && <SocialBtn type="bilibili" url={bilibili} />}
          {email && <SocialBtn type="email" url={`mailto:${email}`} />}
          {x && <SocialBtn type="x" url={x} />}
          {youtube && <SocialBtn type="youtube" url={youtube} />}
        </div>
      </div>
    </div>
  );
}

function AvatarBlock({ avatarUrl }: { avatarUrl: string }) {
  return (
    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-400 to-purple-400 p-[3px] shadow-lg transition-all duration-500 hover:shadow-xl hover:scale-110 hover:rotate-6 cursor-pointer">
      <img
        src={avatarUrl}
        alt="avatar"
        className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-800"
      />
    </div>
  );
}

function StatItem({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center group/stat">
      <div
        className={`text-xl md:text-2xl font-black ${color} transition-transform group-hover/stat:scale-110`}
      >
        {count}
      </div>
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

function SocialBtn({
  type,
  url,
}: {
  type: string;
  url?: string;
}) {
  const getIcon = () => {
    switch (type) {
      case "github":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        );
      case "bilibili":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/>
          </svg>
        );
      case "email":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case "x":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case "youtube":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const content = (
    <div
      className="w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:scale-125 hover:-translate-y-1 transition-all duration-300 border border-white/40 dark:border-white/10 shadow-sm"
      title={type}
    >
      {getIcon()}
    </div>
  );

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}