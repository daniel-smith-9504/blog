# 博客部署完全指南

> 本文档面向 **从 GitHub fork 仓库到自部署** 的全流程，目的是让任何拿到这个仓库的人都能把博客在自己的域名上跑起来。
>
> 阅读顺序按"第 1 步 → 第 N 步"执行即可。每一步都标注了「在哪里点」「填什么值」「为什么这么做」「常见坑」。

---

## 0. 整体架构一览

| 模块 | 技术 | 在哪 |
|------|------|------|
| 前台 + API | Next.js 16（App Router）| Vercel |
| 后台 | Vue 3 + Vite | Vercel（构建产物 `public/admin/`）|
| 数据库 | PostgreSQL | Vercel Postgres / Neon / Supabase |
| 对象存储 | Cloudflare R2（S3 兼容）| Cloudflare R2 |
| 认证 | GitHub OAuth | GitHub Developer Settings |
| 邮件（可选）| Resend | Resend |

部署完成后用户访问 `https://<你的域名>` 看到前台，进入 `/admin` 走 GitHub OAuth 登录后台。

---

## 1. 准备：你需要的账号 / 工具

1. 一个 **GitHub** 账号（用于 fork、代码托管、OAuth 登录）。
2. 一个 **Vercel** 账号（建议用 GitHub 登录）：<https://vercel.com>。
3. 一个 **PostgreSQL** 数据库。两种选择：
   - **Vercel Postgres**（Vercel 自带，集成最简单）
   - **Neon**（<https://neon.tech>，免费额度够个人博客用）
4. 一个 **Cloudflare** 账号，用于开 R2：<https://dash.cloudflare.com>。
5. （可选）**Resend** 账号，用于发通知邮件：<https://resend.com>。
6. （可选）一个自己的 **域名**（在 Cloudflare 解析最方便）。

> 如果只是想跑起来先看看效果，第 5、6 步可以先跳过，R2 也暂时用不到，但 OAuth、PostgreSQL 是必须有的。

---

## 2. Fork 仓库

1. 打开原仓库页面（按你 fork 的来源，URL 自带）。
2. 点右上角的 **Fork** 按钮。
3. 选择你的 GitHub 账号，确认仓库名（默认是 `Kirameku` 或 `sure`，可改可不改）。
4. Fork 完成后，在你账号下会出现一个 `https://github.com/<你的用户名>/<仓库名>` 的仓库。

> 不要勾选 "Only fork the default branch" 之类的复选框，全部分支都拿过来。

---

## 3. 准备 PostgreSQL 数据库

以 Neon 为例（Vercel Postgres 类似）：

1. 登录 <https://neon.tech>，点 **Create a project**。
2. Region 选 **Singapore** 或 **US East**（Vercel 离哪个近选哪个，Vercel Postgres 已经在它的边缘节点上）。
3. 名字随便起，例：`kirameku-db`。
4. 创建后点 **Connection string**，选 **Pooled connection**（生产用这个）。
5. 复制形如下面的 URL，**保存到记事本**：

```
postgresql://用户名:密码@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

这就是后面要填到 Vercel 的 `DATABASE_URL`。

> ⚠️ 不要把这条字符串 commit 到任何地方，下一步只在 Vercel 控制台里粘贴。

---

## 4. 准备 Cloudflare R2（用于图片 / 音乐 / 图书 / 头像存储）

1. 登录 <https://dash.cloudflare.com>，左侧菜单找到 **R2 Object Storage**。
2. 第一次会让你创建一个付款方式（**有 10GB 免费额度**，个人博客基本不花钱）。
3. 点 **Create bucket**：
   - Bucket name：`kirameku-files`（这个值会对应 `R2_BUCKET_NAME`）
   - Location：自动
4. 进入 bucket，顶部找到 **Settings → Public access**：
   - 点 **Connect domain**（推荐）：把自己的 `files.<你的域名>` 绑到 R2 上做公开域名。
   - 或者直接用 R2 默认的 `pub-xxx.r2.dev` 临时域名也行（**注意：临时域名会过期**）。
   - 复制形如 `https://files.your-domain.com/` 的 URL，**保存**，这就是 `R2_PUBLIC_URL`。
5. 回到 R2 首页左侧 **Manage R2 API Tokens → Create API token**：
   - Permissions：**Object Read & Write**
   - 指定 bucket：选刚创建的 `kirameku-files`
   - 点创建，记下三个值：
     - `Account ID` → 写到 `R2_ACCOUNT_ID`
     - `Access Key ID` → 写到 `R2_ACCESS_KEY_ID`
     - `Secret Access Key` → 写到 `R2_SECRET_ACCESS_KEY`（**只显示一次**）

到这里你应该已经在记事本上存了 4 个 R2 相关值。

---

## 5. 准备 GitHub OAuth（用于后台登录）

1. 打开 <https://github.com/settings/developers>。
2. 点 **New OAuth App**。
3. 填表（**先不要用真实域名**，第 8 步部署完再回来改）：

   | 字段 | 临时填什么 | 部署后改成什么 |
   |------|----------|--------------|
   | Application name | `Kirameku (dev)` | `Kirameku` |
   | Homepage URL | `http://localhost:3000` | `https://<你的域名>` |
   | Authorization callback URL | `http://localhost:3000/api/auth/github/callback` | `https://<你的域名>/api/auth/github/callback` |

4. 点 **Register application**。
5. 复制 **Client ID** 和生成一个 **Client secret**（**只显示一次**）。

> 把 Client ID / Secret 存到记事本。如果第 8 步部署时还没换正式 URL，本地开发也能继续用临时的两个值。

---

## 6. 在 Vercel 创建项目

1. 登录 <https://vercel.com>，点 **Add New… → Project**。
2. 选择 **Import** 你刚 fork 的 GitHub 仓库。
3. 进入项目配置页，**暂时不要点 Deploy**，先把以下内容填好：

### 6.1 框架与构建命令
- Framework Preset 自动识别为 **Next.js**。
- Build Command **保持默认**（项目根 `package.json` 的 `build` 脚本会自动 build admin + Next.js）。
- Install Command 默认 `npm install`，**不要改**。

### 6.2 环境变量（Environment Variables）
点 **Environment Variables**，逐条添加（值见前面几步）：

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | 第 3 步复制的 PostgreSQL URL | Prisma 数据源 |
| `SECRET_KEY` | 随机 32 字节字符串（用 `openssl rand -hex 32` 生成）| JWT 签名密钥 |
| `FRONTEND_ORIGIN` | `https://<你的域名>` | OAuth 回调、Cookie 域 |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | |
| `R2_ACCESS_KEY_ID` | R2 API token 的 Access Key | |
| `R2_SECRET_ACCESS_KEY` | R2 API token 的 Secret | |
| `R2_BUCKET_NAME` | `kirameku-files` | |
| `R2_PUBLIC_URL` | `https://files.<你的域名>/` | 公开访问前缀 |
| `GITHUB_CLIENT_ID` | 第 5 步的 Client ID | |
| `GITHUB_CLIENT_SECRET` | 第 5 步的 Client Secret | |
| `ADMIN_GITHUB_USERS` | 你的 GitHub 用户名（多个用 `,` 分隔）| 后台登录白名单 |
| `RESEND_API_KEY` | （可选）Resend 的 Key | 邮件通知 |

> 所有 Secret 类变量选 **Sensitive** 选项，避免在日志里泄露。

### 6.3 首次部署
- 点 **Deploy**。
- 等构建完成，Vercel 会给你一个 `*.vercel.app` 的临时域名（后面绑定真实域名前先用这个测试）。

---

## 7. 初始化数据库表结构

部署完之后数据库是空的，需要把表创建出来。

1. 在 Vercel 项目里进入 **Settings → Build & Development Settings**，或者在本地：

```bash
git clone https://github.com/<你的用户名>/<仓库名>.git
cd <仓库名>
npm install
# 把第 3 步的 DATABASE_URL 临时写到本机 .env 里
echo "DATABASE_URL=postgresql://..." > .env
npx prisma db push   # 把 schema.prisma 里的表结构建到数据库
# （可选）写入初始数据
npm run db:seed
```

2. Vercel 部署后访问 `https://<你的域名>/api/health`（或你健康检查的接口）确认 API 已通。

> 第一次 `prisma db push` 会创建所有表，**请勿重复执行 schema 跟生产库不一致的命令**。

---

## 8. 绑定正式域名（可选但推荐）

1. 域名的 DNS 在 Cloudflare 的话最省事：
   - 切到 Cloudflare → 你的域名 → DNS → Records
   - 添加一条 CNAME：`@` → `cname.vercel-dns.com`（Vercel 控制台会给你精确值）
   - 添加一条 CNAME：`www` → `cname.vercel-dns.com`
2. Vercel 项目 → **Settings → Domains**，添加你的域名，按提示完成验证。
3. SSL 证书 Vercel 自动签发，**等待 5-10 分钟**。
4. 回到第 5 步，**修改 GitHub OAuth 的 Homepage URL 和 Callback URL** 为正式域名。
5. **同步修改 Vercel 的环境变量 `FRONTEND_ORIGIN`**，改完点 **Deployments → 最新部署 → Redeploy**。
6. 用新域名访问 `https://<你的域名>/admin`，确认能跳到 GitHub 登录页。

---

## 9. 验证部署是否完整

按顺序访问下面的 URL（把 `your-domain.com` 换成你的实际域名）：

| 验证项 | URL | 期望 |
|--------|-----|------|
| 首页 | `https://your-domain.com/` | 正常渲染，看到 Hero、卡片 |
| 仪表盘 | `/api/dashboard/stats` | 返回 JSON，无 500 |
| 欢迎页 | `/api/dashboard/welcome` | 返回 `chartData` 等 |
| 照片数量 | `/api/albums` | 数组，每个有 `photo_count` |
| 后台 | `/admin/` | 静态页加载（可重定向 GitHub 登录）|
| 后台登录 | 点登录 → GitHub OAuth → 跳回 `/admin/` | 登录成功 |
| 上传图片 | 后台 → 媒体库 → 上传一张图 | 上传成功，能在前台显示 |
| 真实数据 | 后台首页 4 张卡 | 显示真实访客 / 评论 / 文章数 |
| 建站时间 | 前台底部「系统稳定运行」| 从 2026-06-16 算起 |

---

## 10. 日常开发与再部署

1. 在本地编辑代码。
2. 提交到自己的 fork 仓库：
   ```bash
   git add .
   git commit -m "feat: ..."
   git push origin main
   ```
3. Vercel 会自动触发一次构建（**无需手动操作**）。
4. 部署完成 Vercel 会发邮件通知。失败时点 Deployments → 失败那条 → **View Function Logs** 看原因。

后台 (`admin/`) 改完代码后，**因为 admin 走的是预构建产物**，所以提交之后 `main` 分支会自动跑 `npm run build`（里面有 `npm --prefix admin run build`），把新 dist 推到 `public/admin/`。**不要手动忽略 admin 的构建失败**，否则后台会停滞在旧版本。

---

## 11. 常见问题与排查

### Q1. 部署后 `500 Internal Server Error` 出现在 dashboard
- 看 Vercel Logs：常见是 `relation "Visitor" does not exist`。原因：PostgreSQL 默认大小写敏感，且表名带双引号。
- 已修复：仓库里的 `app/api/dashboard/stats/route.ts` 和 `app/api/dashboard/welcome/route.ts` 都已用 `"Visitor"` 这种带引号的写法。

### Q2. 部署后图片 404
- 检查 Vercel 环境变量 `R2_PUBLIC_URL` 是否正确，**带不带末尾斜杠**都可以。
- 进 Cloudflare → R2 → bucket → Settings → 确认 Public access 已开启。
- 上传后访问拼接的 URL，看能否直接打开。

### Q3. 后台 GitHub 登录无限重定向
- `FRONTEND_ORIGIN` 和 GitHub OAuth 的 callback URL **必须完全一致**（包括协议、域名、路径）。
- `ADMIN_GITHUB_USERS` 里要包含你登录用的 GitHub 用户名（**区分大小写**）。

### Q4. Prisma Client 报 `PrismaClientInitializationError`
- 多半是 `DATABASE_URL` 拼错或被 Cloudflare R2 / Neon 限流。
- 把字符串原样回显到本地 `.env` 测试 `npx prisma db push`。

### Q5. 后台白屏 / 报 `platform-config.json 404`
- `npm run build` 失败导致 `public/admin/` 没生成。检查 Vercel 构建日志里 admin 那一段。
- 已经修过：代码在 admin/build 启动时会把 `platform-config.json` 内联到首页。

### Q6. 部署失败：`Cannot find module '@prisma/client'`
- 在 Vercel → Project → Settings → **Build & Development Settings** → **Install Command** 改成：
  ```
  npm install && npm --prefix admin install
  ```
  仓库的 `postinstall` 钩子会跑 `prisma generate`，依赖关系是齐的。

---

## 12. 不应该出现在 GitHub 仓库的文件（清理清单）

> 仓库代码里下面这些文件/目录是 **开发时本地产物**，如果是从别人仓库 fork 来的，**请直接删除本地副本**并确保它们没在你的 fork 历史里。

| 路径 | 是什么 | 为什么要删 |
|------|------|-----------|
| `.wrangler/` | Cloudflare Wrangler 本地开发缓存 | 几 MB 的 wasm/sqlite 缓存，不影响部署 |
| `analyze-handler.cjs` | 调试 Cloudflare 编译产物脚本 | 一次性调试脚本，已完成使命 |
| `analyze-require.cjs` | 同上 | 同上 |
| `check-middleware.cjs` | 同上 | 同上 |
| `check-module.cjs` | 同上 | 同上 |
| `check-modules.cjs` | 同上 | 同上 |
| `check-handler.cjs` | 同上 | 同上 |
| `fix-handler.cjs` | 同上 | 同上 |
| `public/uploads/*` | 本地上传到 R2 之前的兜底文件 | 真生产靠 R2，本地副本纯属个人测试数据 |
| `public/images/hong.jpg` 等 | 早期调试用图 | 跟实际数据库无关 |
| `tmp-debug/` 等临时目录 | 临时输出 | 一定不要 commit |

> 这些文件在仓库的 `.gitignore` 里都已经写好了黑名单（见 `.gitignore`），但**早先的 commit 历史里仍然有它们**。fork 完之后建议执行一次：
>
> ```bash
> git rm -r --cached .wrangler analyze-*.cjs check-*.cjs fix-*.cjs public/uploads public/images
> git commit -m "chore: remove local-only artifacts from tracking"
> git push
> ```

---

## 13. 关键文件速查

| 文件 | 作用 |
|------|------|
| `siteConfig.ts` | 站点名、备案号、建站时间、API base 等 |
| `prisma/schema.prisma` | 数据库表结构，部署后用 `prisma db push` 建表 |
| `next.config.ts` | Next.js 配置（含 `/admin` rewrite）|
| `app/lib/r2.ts` | R2 客户端（上传 / 删除 / CORS）|
| `app/lib/prisma.ts` | Prisma 单例 |
| `app/lib/auth.ts` | JWT 签发 / 验证 |
| `app/api/auth/github/*` | GitHub OAuth 入口和回调 |
| `app/api/dashboard/stats` | 仪表盘数据接口 |
| `app/api/dashboard/welcome` | 后台首页 4 张卡数据接口 |
| `app/api/albums/sync-count` | 一次性修复 `photo_count` 漂移 |
| `admin/build/platform-config.json` | 后台运行配置（构建时由 Vite 生成）|
| `.env.example` | 环境变量名清单（**不要把真实值提交**）|

---

## 14. 一句话总结

> fork → 建 Postgres → 开 R2 → 注册 GitHub OAuth → 在 Vercel 导入仓库填好所有环境变量 → 部署 → `prisma db push` → 改 OAuth 回调为正式域名 → 访问 `https://<你的域名>`。

按这个流程走下来，整个部署一般在 30 分钟内完成。