import { request } from "./client";

export interface FriendLinkItem {
  id: number;
  name: string;
  url: string;
  avatar: string;
  description: string;
  sort: number;
  is_approved: boolean;
  created_at: string;
}

export function getFriendLinks() {
  return request<FriendLinkItem[]>("/api/friend-links");
}

/** 前台提交友链申请 */
export function submitFriendLink(data: {
  name: string;
  url: string;
  avatar?: string;
  description?: string;
}) {
  return request<{ code: number; message: string }>(
    "/api/friend-links/public",
    { method: "POST", body: JSON.stringify(data) }
  );
}
