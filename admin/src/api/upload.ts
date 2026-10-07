import { http } from "@/utils/http";

export const getPresignedUrl = (data: {
  filename: string;
  contentType: string;
  prefix?: string;
}) => {
  return http.request<{ url: string; key: string }>(
    "post",
    "/api/upload/presigned",
    { data }
  );
};
