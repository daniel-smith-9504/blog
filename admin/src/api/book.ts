import { http } from "@/utils/http";

export type BookItem = {
  id: number;
  title: string;
  author: string;
  cover: string;
  description: string;
  file_url: string;
  format: string;
  file_size: number;
  category_id: number | null;
  sort: number;
  views: number;
  created_at: string;
  updated_at: string;
  category?: { id: number; name: string } | null;
};

export type BookCategoryItem = {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort: number;
  _count?: { books: number };
};

/** 获取图书列表 */
export const getBooks = (params?: {
  q?: string;
  category_id?: number;
  format?: string;
  page?: number;
  page_size?: number;
}) => {
  return http.request<{
    books: BookItem[];
    categories: BookCategoryItem[];
    total: number;
  }>("get", "/api/books", { params });
};

/** 获取图书分类 */
export const getBookCategories = () => {
  return http.request<{ categories: BookCategoryItem[] }>(
    "get",
    "/api/books/categories"
  );
};

/** 创建分类 */
export const createBookCategory = (data: {
  name: string;
  slug?: string;
  description?: string;
  sort?: number;
}) => {
  return http.request<BookCategoryItem>(
    "post",
    "/api/books/categories",
    { data }
  );
};

/** 更新分类 */
export const updateBookCategory = (
  id: number,
  data: { name?: string; slug?: string; description?: string; sort?: number }
) => {
  return http.request<BookCategoryItem>(
    "put",
    `/api/books/categories/${id}`,
    { data }
  );
};

/** 删除分类 */
export const deleteBookCategory = (id: number) => {
  return http.request<{ ok: boolean }>(
    "delete",
    `/api/books/categories/${id}`
  );
};

/** 删除图书 */
export const deleteBook = (id: number) => {
  return http.request<{ success: boolean }>("delete", `/api/books/${id}`);
};

/** 上传图书 */
export const uploadBook = (formData: FormData) => {
  return http.request<{ success: boolean; book: BookItem }>(
    "post",
    "/api/upload/book",
    {
      data: formData,
      timeout: 180000
    }
  );
};