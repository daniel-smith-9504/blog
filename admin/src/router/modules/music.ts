import { music } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/music",
  name: "Music",
  component: Layout,
  redirect: "/music/index",
  meta: {
    icon: "ri:music-2-line",
    title: "音乐管理",
    rank: music
  },
  children: [
    {
      path: "/music/index",
      name: "MusicIndex",
      component: () => import("@/views/music/index.vue"),
      meta: {
        title: "本地音乐"
      }
    }
  ]
} satisfies RouteConfigsTable;
