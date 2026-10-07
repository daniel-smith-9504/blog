import { http } from "@/utils/http";

export type UserResult = {
  code: number;
  message: string;
  data: {
    avatar: string;
    username: string;
    nickname: string;
    roles: Array<string>;
    permissions: Array<string>;
    accessToken: string;
    refreshToken: string;
    expires: string;
  };
};

export type UserInfo = {
  avatar: string;
  username: string;
  nickname: string;
  email: string;
  bio: string;
};

export type UserInfoResult = {
  code: number;
  message: string;
  data: UserInfo;
};

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<UserResult>("post", "/api/auth/login", { data });
};

/** 获取当前用户信息 */
export const getMine = () => {
  return http.request<UserInfoResult>("get", "/api/auth/me");
};

/** 更新当前用户信息 */
export const updateMine = (data: {
  nickname?: string;
  email?: string;
  bio?: string;
  avatar?: string;
}) => {
  return http.request<{ code: number; message: string }>("put", "/api/auth/me", {
    data
  });
};

/** 刷新token */
export const refreshTokenApi = (data?: object) => {
  return http.request<UserResult>("post", "/api/auth/refresh-token", { data });
};

/** 个人安全日志 */
export const getMineLogs = (params?: { page?: number; pageSize?: number }) => {
  return http.request<{
    code: number;
    message: string;
    data?: { list: Array<any>; total?: number; pageSize?: number; currentPage?: number };
  }>("get", "/api/auth/me-logs", { params });
};

/** 修改密码 */
export const changePassword = (data: { oldPassword: string; newPassword: string }) => {
  return http.request<{ code: number; message: string }>("post", "/api/auth/change-password", {
    data
  });
};
