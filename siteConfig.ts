// siteConfig.ts - 全站配置中心（前端兜底配置，优先使用数据库中的站点配置）

export const siteConfig = {
  // 网站标题与博主信息
  title: "My Blog",
  url: "https://example.com/",
  authorName: "Admin",
  bio: "欢迎来到我的博客",

  // 头像设置
  avatarUrl: "https://files-blog-sure.20130825.xyz/icon.jpg",

  // 头像点击跳转链接（后台站点配置 websiteUrl，空则不跳转）
  websiteUrl: "",

  // 背景设置
  useGradient: false,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"],
  bgImages: [],

  // 默认封面图
  defaultPostCover: "",

  // 照片墙预览图
  photoWallImage: "",

  // 云音乐配置（网易云音乐）
  cloudMusicPlaylistId: "",
  cloudMusicIds: [],

  // 后端 API 地址
  apiBaseUrl: "",

  // 社交链接
  social: {
    github: "",
    bilibili: "",
    email: "",
    x: "",
    youtube: "",
  },

  // 站点信息
  buildDate: "2013-08-25T00:00:00",
  icpConfig: {
    name: "",
    link: "",
  },
  moeIcpConfig: {
    name: "",
    link: "",
  },

  // 分类标题
  chatterTitle: "留言",
  chatterDescription: "记录生活、技术与随想",
};