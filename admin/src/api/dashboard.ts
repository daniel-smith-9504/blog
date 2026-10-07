import { http } from "@/utils/http";

export type DashboardStats = {
  counts: {
    posts: number;
    drafts: number;
    categories: number;
    tags: number;
    comments: number;
    messages: number;
    visitors: number;
    totalVisits?: number;
    chatters: number;
    music: number;
    friendLinks: number;
    photos: number;
  };
  post_trend: Array<{ date: string; count: number }>;
  visitor_trend: Array<{ date: string; count: number }>;
  category_distribution: Array<{ name: string; value: number }>;
  browser_distribution: Array<{ name: string; value: number }>;
};

export type WelcomeChartItem = {
  name: string;
  value: number;
  data: number[];
};

export type WelcomeLatestItem = {
  date: string;
  requiredNumber: number;
  resolveNumber: number;
  type: "post" | "chatter";
  title: string;
};

export type WelcomeStats = {
  chartData: WelcomeChartItem[];
  barChartData: Array<{
    requireData: number[];
    questionData: number[];
  }>;
  latestNewsData: WelcomeLatestItem[];
};

/** 获取仪表盘统计数据 */
export const getDashboardStats = () => {
  return http.request<DashboardStats>("get", "/api/dashboard/stats");
};

/** 获取后台首页 / 欢迎页统计 */
export const getWelcomeStats = () => {
  return http.request<WelcomeStats>("get", "/api/dashboard/welcome");
};
