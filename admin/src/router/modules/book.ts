import { book } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/book",
  name: "Book",
  component: Layout,
  redirect: "/book/index",
  meta: {
    icon: "ri:book-open-line",
    title: "图书馆管理",
    rank: book
  },
  children: [
    {
      path: "/book/index",
      name: "BookIndex",
      component: () => import("@/views/book/index.vue"),
      meta: {
        title: "图书管理"
      }
    },
    {
      path: "/book/category",
      name: "BookCategory",
      component: () => import("@/views/book/category.vue"),
      meta: {
        title: "图书分类"
      }
    }
  ]
} satisfies RouteConfigsTable;