# Sure 博客 · 游客视角前台加载架构图

> 未登录、无后台权限的游客访问前台各页面时的完整运转链路（依据仓库代码逐文件核对绘制）。
> 渲染方式：在支持 Mermaid 的地方（GitHub / Typora / Obsidian / mermaid.live）直接预览本文件的图表，或使用下方 PNG 图片版本 `visitor-architecture.png`。

```mermaid
flowchart TD

%% ═══════════ 第 0 层 · 访客入口 ═══════════
subgraph group_visitor["访客入口（第 0 层）"]
  node_browser(("游客浏览器<br/>未登录 · 无后台权限"))
  node_domain(("输入域名<br/>DNS → HTTPS"))
  node_server(("Next.js 服务器<br/>Vercel / Docker · App Router 接管"))
  node_entry(("三个进入方式<br/>直敲域名 · URL 直达子页 · 搜索框关键词/暗号"))
  node_browser --> node_domain --> node_server --> node_entry
end

%% ═══════════ 第 1 层 · 全局框架 ═══════════
subgraph group_global["全局框架（第 1 层 · 每个页面必经的公共链路）"]
  node_meta["服务端 generateMetadata<br/>getDbSiteConfig() 读库 · 失败回退 siteConfig.ts<br/>生成 title / 描述 / 图标"]
  node_root["RootLayout 再次 getDbSiteConfig()<br/>dbConfig → 注入 Provider"]
  node_providers["Provider 嵌套链<br/>SiteConfig → Theme → Effect → WelcomeScreen<br/>→ Background → Music → Toast"]
  node_ui["全局 UI 组件<br/>BackgroundRenderer · Navbar · ClickEffect<br/>RadialMenu · MouseTrail · SeasonalEffect · KiraSparkle"]
  node_sitecfg["SiteConfigProvider 启动请求<br/>GET /api/site-config?_t=时间戳 · no-store<br/>每 15 秒轮询 + 聚焦 / bfcache 刷新"]
  node_visitor_track["VisitorTracker 访客统计<br/>POST /api/visitors/record<br/>+ GET /api/visitors/location"]
  node_widgets["ClientWidgets 悬浮组件（动态加载）<br/>FloatingPlayer · Live2D 看板娘<br/>Toolbox 工具箱 · GamesPanel 小游戏"]
  node_anon["可选登录（游客可不做）<br/>POST /api/auth/anonymous → anonymous_token 存 localStorage<br/>GitHub 登录 /api/auth/github/login"]
  node_meta --> node_root --> node_providers --> node_ui
  node_providers -.->|"配置轮询"| node_sitecfg
  node_providers -.->|"记录访问"| node_visitor_track
  node_providers -.->|"动态挂载"| node_widgets
  node_ui -.->|"互动时才触发"| node_anon
end

%% ═══════════ 分叉枢纽 ═══════════
node_entry -->|"路由分发"| node_meta
node_hub(("前台页面路由分叉<br/>16 个页面"))
node_ui --> node_hub

%% ═══════════ ① 首页 ═══════════
subgraph group_home["① 首页 /"]
  node_home(("首页 /<br/>域名直敲第一落点"))
  node_home_srv["Server Component<br/>app/page.tsx · force-dynamic 禁止缓存"]
  node_home_db["并行直连 Prisma（不走 API）<br/>post.count · chatter.count · album.findMany"]
  node_home_client["渲染 HomeClient<br/>把三个 count 作为 props"]
  node_home_cards["8 个区块组件（next/dynamic 动态导入）<br/>ProfileCard · CloudPlayer · LyricBar<br/>LatestPostsCarousel · LatestChatterCarousel<br/>PhotoWallPreview · DogDiary · SiteDashboard"]
  node_home --> node_home_srv --> node_home_db --> node_home_client --> node_home_cards
end

%% ═══════════ ② 文章列表 ═══════════
subgraph group_posts["② 文章列表 /posts"]
  node_posts(("文章列表 /posts<br/>分类筛选 · 搜索 · 分页"))
  node_posts_cat["getCategories() → 分类条"]
  node_posts_list["getPosts({published, page, size:12})<br/>category / keyword 追加筛选 · 滚动加载更多"]
  node_posts_card["PostCard 渲染卡片<br/>封面 = post.cover || defaultPostCover 兜底"]
  node_posts_search["SearchBar 搜索框<br/>关键词 → 重新请求"]
  node_posts_garden["暗号 5201314 → localStorage 标记 → /garden"]
  node_posts_admin["暗号 20130825 → /admin（游客被要求登录）"]
  node_posts --> node_posts_cat --> node_posts_list --> node_posts_card
  node_posts_card -.-> node_posts_search
  node_posts_search --> node_posts_garden
  node_posts_search --> node_posts_admin
end

%% ═══════════ ③ 文章详情 ═══════════
subgraph group_post["③ 文章详情 /posts/[slug]"]
  node_post(("文章详情 /posts/[slug]<br/>阅读 · 点赞 · 评论"))
  node_post_get["getPostBySlug(slug)<br/>正文 + 分类 + 标签 + 阅读量"]
  node_post_render["渲染正文 Markdown → HTML<br/>代码高亮 · 默认封面兜底 · 阅读进度条"]
  node_post_like["游客点赞：无 token 则自动匿名认证<br/>likePost → 已赞状态存 localStorage"]
  node_post_comments["评论区加载（游客可看）<br/>发评论需 GitHub 登录"]
  node_post --> node_post_get --> node_post_render
  node_post_render -.-> node_post_like
  node_post_render -.-> node_post_comments
end

%% ═══════════ ④ 说说 ═══════════
subgraph group_moments["④ 说说 /moments"]
  node_moments(("说说 / 动态<br/>游客可浏览、点赞"))
  node_moments_get["getChatters({published, size:50})"]
  node_moments_cmt["逐条拉评论 getChatterComments(cid)"]
  node_moments_like["点赞：纯前端 localStorage（liked_chatters）<br/>可选匿名 token 同步"]
  node_moments_render["时间线列表 · 心形动画 · 展开评论"]
  node_moments --> node_moments_get --> node_moments_cmt --> node_moments_render
  node_moments_render -.-> node_moments_like
end

%% ═══════════ ⑤ 音乐 ═══════════
subgraph group_music["⑤ 音乐 /music"]
  node_music(("音乐 /music<br/>游客可直接听"))
  node_music_provider["全局 MusicProvider<br/>播放 / 暂停 / 进度 / 列表状态"]
  node_music_api["GET /api/music<br/>force-dynamic · nodejs runtime"]
  node_music_netease["网易云歌曲：服务端 Meting 代理<br/>歌单 / 歌词 / 播放地址"]
  node_music_local["本地音乐：读数据库记录<br/>R2 流式下载音频文件"]
  node_music_player["CloudPlayer / FloatingPlayer 播放<br/>歌词滚动 · 悬浮播放器"]
  node_music --> node_music_provider --> node_music_api
  node_music_api --> node_music_netease
  node_music_api --> node_music_local
  node_music_provider --> node_music_player
end

%% ═══════════ ⑥ 关于 ═══════════
subgraph group_about["⑥ 关于 /about"]
  node_about(("关于 /about<br/>纯服务端渲染"))
  node_about_cfg["getDbSiteConfig() → 头像 / 标题"]
  node_about_md["gray-matter 解析内置 about-content<br/>frontmatter 取封面"]
  node_about_pipe["服务端 Markdown 管线<br/>unified → remark → rehype<br/>→ 代码高亮 → HTML"]
  node_about_render["封面大图 + 自我介绍正文<br/>FadeIn 入场动画"]
  node_about --> node_about_cfg --> node_about_md --> node_about_pipe --> node_about_render
end

%% ═══════════ ⑦ 小说列表 ═══════════
subgraph group_novel["⑦ 小说列表 /novel"]
  node_novel(("小说列表 /novel<br/>游客可浏览"))
  node_novel_get["fetch('/api/books?' + params)<br/>搜索 / 分页"]
  node_novel_prog["GET /api/books/progress/list?ids=…<br/>游客无 token → 返回空 / 不记录"]
  node_novel_render["书单渲染：封面 + 标题 + 简介<br/>继续阅读按钮"]
  node_novel --> node_novel_get
  node_novel --> node_novel_prog
  node_novel --> node_novel_render
end

%% ═══════════ ⑧ 阅读页 ═══════════
subgraph group_reader["⑧ 阅读页 /novel/[bookUrl]"]
  node_reader(("阅读页 /novel/[bookUrl]<br/>epub 在线阅读器"))
  node_reader_book["GET /api/books/[bookId]<br/>书籍元数据 + file_url"]
  node_reader_chap["GET /api/books/[bookId]/chapters<br/>+ /progress（游客返回空）"]
  node_reader_file["fetch(book.file_url)<br/>从 R2 取 epub 二进制"]
  node_reader_parse["epubjs 解包<br/>_lib/epub-parser.ts isRealChapter 过滤真实章节"]
  node_reader_ui["分页滑动 · 字号/主题（localStorage）<br/>进度保存"]
  node_reader_note["选中文字做笔记<br/>需先匿名认证"]
  node_reader --> node_reader_book --> node_reader_chap
  node_reader --> node_reader_file --> node_reader_parse --> node_reader_ui
  node_reader_ui -.-> node_reader_note
end

%% ═══════════ ⑨ 留言板 ═══════════
subgraph group_messages["⑨ 留言板 /messages"]
  node_messages(("留言板 /messages<br/>游客可匿名留言"))
  node_messages_get["getMessages({page, size:50})"]
  node_messages_auth["首次互动自动匿名认证<br/>POST /api/auth/anonymous → 存 token<br/>GET /api/auth/anonymous/me 校验"]
  node_messages_post["createMessage() → POST /api/messages<br/>可填昵称 / 邮箱"]
  node_messages_like["点赞 localStorage（liked_messages）"]
  node_messages_github["可选 GitHub 登录 → 显示真实头像昵称"]
  node_messages --> node_messages_get
  node_messages_get -.-> node_messages_auth
  node_messages_auth --> node_messages_post
  node_messages_post -.-> node_messages_like
  node_messages --> node_messages_github
end

%% ═══════════ ⑩ 照片墙 ═══════════
subgraph group_photowall["⑩ 照片墙 /photowall"]
  node_photowall(("照片墙 /photowall<br/>游客可浏览"))
  node_photowall_albums["getAlbums() → 相册列表"]
  node_photowall_photos["getAlbumPhotos(album.id) → 照片列表"]
  node_photowall_render["相册卡片网格 + 照片灯箱"]
  node_photowall --> node_photowall_albums --> node_photowall_photos --> node_photowall_render
end

%% ═══════════ ⑪ 收藏 ═══════════
subgraph group_bookmark["⑪ 收藏 /bookmark"]
  node_bookmark(("收藏 /bookmark<br/>公开收藏夹"))
  node_bookmark_get["getBookmarks() → 站名 / 图标 / 链接"]
  node_bookmark_render["图标卡片 + 外链跳转"]
  node_bookmark --> node_bookmark_get --> node_bookmark_render
end

%% ═══════════ ⑫ 友链 ═══════════
subgraph group_friends["⑫ 友链 /friends"]
  node_friends(("友链 /friends<br/>游客可浏览"))
  node_friends_get["getFriendLinks() → 友链表"]
  node_friends_render["头像 + 站点名 + 一句话介绍卡片"]
  node_friends --> node_friends_get --> node_friends_render
end

%% ═══════════ ⑬ 项目 ═══════════
subgraph group_projects["⑬ 项目 /projects"]
  node_projects(("项目 /projects<br/>纯静态数据"))
  node_projects_data["读内置 projectsData.ts<br/>本地静态项目数组 · 不查库"]
  node_projects_render["项目卡片：封面 / 简介 / 技术标签 / 链接"]
  node_projects --> node_projects_data --> node_projects_render
end

%% ═══════════ ⑭ 归档 ═══════════
subgraph group_timeline["⑭ 归档 /timeline"]
  node_timeline(("归档 /timeline<br/>时光河流"))
  node_timeline_get["getPosts({published, size:200})"]
  node_timeline_render["按时间排序<br/>可拖拽的河流时间轴卡片"]
  node_timeline_cover["封面兜底<br/>post.cover || defaultPostCover（已修复）"]
  node_timeline --> node_timeline_get --> node_timeline_render --> node_timeline_cover
end

%% ═══════════ ⑮ 花园彩蛋 ═══════════
subgraph group_garden["⑮ 彩蛋花园 /garden"]
  node_garden(("彩蛋花园 /garden<br/>输入 5201314 解锁 · 游客可用"))
  node_garden_unlock["任意 SearchBar 输入 5201314<br/>→ localStorage garden-unlock → 跳转"]
  node_garden_dash["仪表盘页 app/garden/page.tsx<br/>星港数据概览"]
  node_garden_stats["统计请求 → recharts 趋势 / 占比图"]
  node_garden_tools["18 个工具子页（左侧导航）<br/>地图 · 太阳系 · 代码雨 · 访客信息 · 烟花 · 流体<br/>万花筒 · 重力沙子 · Python · 生命游戏<br/>数学可视化 · 排序算法 · Markdown · JSON<br/>颜色工具 · 3D 工作室 · 二维码 · 星空"]
  node_garden_front["多数为纯前端效果页<br/>Canvas / WebGL 本地渲染"]
  node_garden --> node_garden_unlock --> node_garden_dash --> node_garden_stats
  node_garden_dash --> node_garden_tools --> node_garden_front
end

%% ═══════════ ⑯ RSS ═══════════
subgraph group_feed["⑯ RSS 订阅 /feed"]
  node_feed(("RSS 订阅 /feed<br/>服务端生成 XML"))
  node_feed_route["Route Handler<br/>app/feed/route.ts（非页面）"]
  node_feed_xml["查库生成 RSS 2.0 XML"]
  node_feed_sub["游客用 RSS 阅读器订阅"]
  node_feed --> node_feed_route --> node_feed_xml --> node_feed_sub
end

%% ═══════════ 分叉连线：枢纽 → 16 个页面 ═══════════
node_hub --> node_home
node_hub --> node_posts
node_hub --> node_post
node_hub --> node_moments
node_hub --> node_music
node_hub --> node_about
node_hub --> node_novel
node_hub --> node_reader
node_hub --> node_messages
node_hub --> node_photowall
node_hub --> node_bookmark
node_hub --> node_friends
node_hub --> node_projects
node_hub --> node_timeline
node_hub --> node_garden
node_hub --> node_feed

%% ═══════════ 第 3 层 · API 服务层 ═══════════
subgraph group_api["API 服务层（第 3 层 · 游客在前台会触发的接口）"]
  node_api(("Next.js API 路由"))
  node_api_sitecfg["GET /api/site-config · 站点配置（15s 轮询）"]
  node_api_posts["GET /api/posts · 列表 / 分页 / 分类 / 关键词"]
  node_api_post["GET /api/posts/[slug] · 详情 + 阅读量+1"]
  node_api_postlike["POST /api/posts/[slug]/like · 点赞（匿名）"]
  node_api_categories["GET /api/categories · 文章分类"]
  node_api_comments["GET /api/comments/[postId] · 评论（游客可看）"]
  node_api_chatters["GET /api/chatters · 说说 + 评论"]
  node_api_messages["GET / POST /api/messages · 留言列表 / 匿名留言"]
  node_api_albums["GET /api/albums · 相册 + 照片数"]
  node_api_music["GET /api/music · 歌单（网易云代理 + 本地）"]
  node_api_musicdl["GET /api/music/download/:dbId · 本地音频"]
  node_api_books["GET /api/books · 小说列表"]
  node_api_book["GET /api/books/[id] · 书籍信息 + 文件地址"]
  node_api_chapters["GET /api/books/[id]/chapters · 章节列表"]
  node_api_progress["GET /api/books/[id]/progress · 进度（游客空）"]
  node_api_notes["/api/books/[id]/notes · 阅读笔记（匿名）"]
  node_api_anon["POST /api/auth/anonymous · 签发游客 token"]
  node_api_anonme["GET /api/auth/anonymous/me · 校验身份"]
  node_api_github["GET /api/auth/github/login · OAuth 登录"]
  node_api_visitors["POST /api/visitors/record · GET /api/visitors/location"]
  node_api_feed["GET /feed · RSS 2.0"]
  node_api_bookmarks["GET /api/bookmarks · GET /api/friend-links"]
end

%% 页面 → API 请求连线
node_home_cards -->|"posts?size=4"| node_api_posts
node_home_cards -->|"chatters?size=4"| node_api_chatters
node_home_cards -->|"albums"| node_api_albums
node_home_cards -->|"dashboard 统计"| node_api_messages
node_posts_cat -->|"GET"| node_api_categories
node_posts_list -->|"GET"| node_api_posts
node_post_get -->|"GET"| node_api_post
node_post_like -->|"POST"| node_api_postlike
node_post_comments -->|"GET"| node_api_comments
node_moments_get -->|"GET"| node_api_chatters
node_moments_cmt -->|"GET"| node_api_comments
node_music_api -->|"GET"| node_api_music
node_music_local -->|"GET"| node_api_musicdl
node_novel_get -->|"GET"| node_api_books
node_novel_prog -->|"GET"| node_api_progress
node_reader_book -->|"GET"| node_api_book
node_reader_chap -->|"GET"| node_api_chapters
node_reader_note -->|"笔记"| node_api_notes
node_messages_get -->|"GET"| node_api_messages
node_messages_auth -->|"POST / GET"| node_api_anon
node_messages_post -->|"POST"| node_api_messages
node_messages_github -->|"跳转"| node_api_github
node_photowall_albums -->|"GET"| node_api_albums
node_photowall_photos -->|"GET"| node_api_albums
node_bookmark_get -->|"GET"| node_api_bookmarks
node_friends_get -->|"GET"| node_api_bookmarks
node_timeline_get -->|"GET"| node_api_posts
node_garden_stats -->|"统计"| node_api_posts
node_garden_stats -->|"统计"| node_api_messages
node_feed_route -->|"订阅"| node_api_feed
node_sitecfg -->|"GET"| node_api_sitecfg
node_visitor_track -->|"POST / GET"| node_api_visitors

%% ═══════════ 第 4 层 · 数据与外部服务 ═══════════
subgraph group_data["数据与外部服务（第 4 层）"]
  node_prisma["Prisma ORM<br/>app/lib/prisma.ts · 所有接口读写入口"]
  node_db[("PostgreSQL 生产库<br/>开发环境 dev.db（SQLite）")]
  node_r2["R2 对象存储<br/>epub 书文件 / 本地音乐 / 图片"]
  node_netease["网易云音乐 API<br/>Meting（@meting/core）服务端代理"]
  node_github["GitHub OAuth<br/>jose 签发 JWT"]
  node_prisma --> node_db
end

%% API → 数据层连线
node_api_sitecfg -->|"读写"| node_prisma
node_api_posts -->|"读写"| node_prisma
node_api_post -->|"读写"| node_prisma
node_api_postlike -->|"读写"| node_prisma
node_api_categories -->|"读写"| node_prisma
node_api_comments -->|"读写"| node_prisma
node_api_chatters -->|"读写"| node_prisma
node_api_messages -->|"读写"| node_prisma
node_api_albums -->|"读写"| node_prisma
node_api_music -->|"元数据"| node_prisma
node_api_music -->|"在线歌曲"| node_netease
node_api_musicdl -->|"音频文件"| node_r2
node_api_books -->|"读写"| node_prisma
node_api_book -->|"读写"| node_prisma
node_api_chapters -->|"读写"| node_prisma
node_api_progress -->|"读写"| node_prisma
node_api_notes -->|"读写"| node_prisma
node_api_anon -->|"签发"| node_prisma
node_api_anonme -->|"校验"| node_prisma
node_api_github -->|"OAuth"| node_github
node_api_visitors -->|"写入"| node_prisma
node_api_feed -->|"读"| node_prisma
node_api_bookmarks -->|"读写"| node_prisma

%% ═══════════ 节点配色 ═══════════
classDef toneSlate fill:#f8fafc,stroke:#475569,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
classDef toneViolet fill:#ede9fe,stroke:#7c3aed,stroke-width:1.5px,color:#4c1d95

class node_browser,node_domain,node_entry,node_hub toneSlate
class node_server,node_meta,node_root,node_providers,node_ui toneIndigo
class node_sitecfg,node_visitor_track,node_anon toneTeal
class node_widgets toneAmber
class node_home,node_posts,node_post,node_moments,node_music,node_about,node_novel,node_reader,node_messages,node_photowall,node_bookmark,node_friends,node_projects,node_timeline,node_garden,node_feed toneBlue
class node_api toneRose
class node_prisma,node_db,node_r2 toneMint
class node_netease,node_github toneAmber
class node_posts_garden,node_posts_admin,node_garden_tools toneViolet

click node_home "https://github.com/sure-block/sure/blob/main/app/page.tsx"
click node_posts "https://github.com/sure-block/sure/blob/main/app/posts/page.tsx"
click node_post "https://github.com/sure-block/sure/blob/main/app/posts/%5Bslug%5D/page.tsx"
click node_moments "https://github.com/sure-block/sure/blob/main/app/moments/page.tsx"
click node_music "https://github.com/sure-block/sure/blob/main/app/music/page.tsx"
click node_about "https://github.com/sure-block/sure/blob/main/app/about/page.tsx"
click node_novel "https://github.com/sure-block/sure/blob/main/app/novel/page.tsx"
click node_reader "https://github.com/sure-block/sure/blob/main/app/novel/%5BbookUrl%5D/page.tsx"
click node_messages "https://github.com/sure-block/sure/blob/main/app/messages/page.tsx"
click node_photowall "https://github.com/sure-block/sure/blob/main/app/photowall/page.tsx"
click node_bookmark "https://github.com/sure-block/sure/blob/main/app/bookmark/page.tsx"
click node_friends "https://github.com/sure-block/sure/blob/main/app/friends/page.tsx"
click node_projects "https://github.com/sure-block/sure/blob/main/app/projects/page.tsx"
click node_timeline "https://github.com/sure-block/sure/blob/main/app/timeline/page.tsx"
click node_garden "https://github.com/sure-block/sure/tree/main/app/garden"
click node_feed "https://github.com/sure-block/sure/blob/main/app/feed/route.ts"
click node_api "https://github.com/sure-block/sure/tree/main/app/api"
click node_prisma "https://github.com/sure-block/sure/blob/main/app/lib/prisma.ts"
click node_r2 "https://github.com/sure-block/sure/blob/main/app/lib/r2.ts"
```
