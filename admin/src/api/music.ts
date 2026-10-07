import { http } from "@/utils/http";

export type MusicItem = {
  id: number;
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrc: string;
  lrcSrc: string;
  type: string;
  sort: number;
  created_at: string;
  updated_at: string;
};

/** 获取本地音乐列表 */
export const getLocalMusics = () => {
  return http.request<MusicItem[]>("get", "/api/music/local");
};

/** 上传音乐 */
export const uploadMusic = (data: FormData) => {
  return http.request<{ success: boolean; music: MusicItem }>("post", "/api/music/upload", {
    data,
    timeout: 120000
  });
};

/** 更新音乐 */
export const updateMusic = (id: number, data: FormData) => {
  return http.request<{ success: boolean; music: MusicItem }>("put", `/api/music/${id}`, {
    data,
    timeout: 120000
  });
};

/** 删除音乐 */
export const deleteMusic = (id: number) => {
  return http.request<{ success: boolean }>("delete", `/api/music/${id}`);
};
