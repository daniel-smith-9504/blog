#博客 服务器自建部署教程（新手版）

本教程面向**完全没有服务器经验**的小白，手把手教你把博客部署到自己的服务器上。

---

## 目录

- [方式一：Docker 一键部署（推荐）](#方式一docker-一键部署推荐)
- [方式二：PM2 手动部署](#方式二pm2-手动部署)
- [配置 Nginx 反向代理 + HTTPS](#配置-nginx-反向代理--https)
- [常见问题](#常见问题)

---

## 前期准备（两种方式都需要）

### 1. 你需要准备什么

| 需要的东西 | 说明 |
|-----------|------|
| 一台服务器 | 推荐 2 核 4G 内存以上，系统 Ubuntu 22.04 或 Debian 12 |
| 一个域名 | 例如 `blog.example.com`，在域名服务商购买 |
| GitHub 账号 | 用于 OAuth 登录后台 |
| Cloudflare 账号 | 用于 R2 对象存储（上传图片） |
| Neon 账号 | 用于 PostgreSQL 数据库（方式二需要） |

### 2. 买服务器

如果还没有服务器，推荐：

- **国内**：腾讯云轻量应用服务器 / 阿里云 ECS（需备案域名）
- **海外**：RackNerd / DigitalOcean / Vultr（不需要备案）

购买后你会得到：
- 服务器 IP 地址（例如 `123.45.67.89`）
- root 密码 或 SSH 密钥

### 3. 连接服务器

#### Windows 用户

1. 下载 [MobaXterm](https://mobaxterm.mobatek.net/)（免费版即可）
2. 打开 MobaXterm → 点 `Session` → 选 `SSH`
3. 填写：
   - Remote host: `你的服务器IP`
   - Username: `root`
   - Port: `22`
4. 点 OK，输入密码，连接成功

#### Mac 用户

打开终端，输入：
```bash
ssh root@你的服务器IP
```

### 4. 创建 GitHub OAuth 应用

1. 打开 [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. 点 `New OAuth App`
3. 填写：
   - Application name: `我的博客`
   - Homepage URL: `https://你的域名.com`
   - Authorization callback URL: `https://你的域名.com/api/auth/github/callback`
4. 创建后复制 `Client ID` 和 `Client Secret`，保存好

### 5. 创建 Cloudflare R2 存储桶

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 左侧菜单 → `R2 对象存储`
3. 点 `创建存储桶`，名称填 `my-blog-files`，其他默认，点创建
4. 进入存储桶 → `设置`：
   - 记录桶名称
   - 如果有自定义域名，点 `连接域` 添加（推荐 `files.你的域名.com`）
5. 回到 R2 首页 → 右侧 `管理 R2 API 令牌` → `创建 API 令牌`
   - 权限选 `对象读与写`
   - 指定桶为你刚创建的桶
   - 点创建后会显示：`Access Key ID` 和 `Secret Access Key`，**复制保存好，只显示一次**
6. 回到 R2 首页，右侧可以看到 `Account ID`

### 6. 生成 SECRET_KEY

在服务器终端执行：
```bash
openssl rand -hex 32
```
会输出一长串随机字符串，复制保存好。

---

## 方式一：Docker 一键部署（推荐）

Docker 方式会**自动帮你装好数据库**，不需要单独装 PostgreSQL。

### 第 1 步：安装 Docker

连接到服务器后，执行：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装成功（会显示版本号）
docker --version
```

### 第 2 步：下载项目代码

```bash
# 进入一个常用目录
cd /opt

# 下载项目（替换成你自己的仓库地址）
git clone https://github.com/你的用户名/sure.git

# 进入项目目录
cd sure/sure-main
```

### 第 3 步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**nano 编辑器使用方法：**
- 用方向键移动光标
- 修改内容
- 按 `Ctrl + O` 保存（会提示文件名，直接按回车）
- 按 `Ctrl + X` 退出

**需要修改的内容（对照你之前准备的信息）：**

```env
# 数据库（Docker 自带数据库，但你也可以用外部的）
DATABASE_URL=postgresql://sure:sure_password_change_me@db:5432/sure_blog?schema=public

# JWT 密钥（第 6 步生成的）
SECRET_KEY=你生成的随机字符串

# 你的域名（末尾不要 /）
FRONTEND_ORIGIN=https://你的域名.com

# GitHub OAuth（第 4 步获取的）
GITHUB_CLIENT_ID=你的Client ID
GITHUB_CLIENT_SECRET=你的Client Secret
ADMIN_GITHUB_USERS=你的GitHub用户名

# R2 存储（第 5 步获取的）
R2_ACCOUNT_ID=你的Account ID
R2_ACCESS_KEY_ID=你的Access Key ID
R2_SECRET_ACCESS_KEY=你的Secret Access Key
R2_BUCKET_NAME=你创建的桶名
R2_PUBLIC_URL=https://files.你的域名.com

# 后台首次登录账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=设置一个强密码

# 站点信息（进后台后可以再改）
SITE_TITLE=我的博客
SITE_URL=https://你的域名.com
SITE_AUTHOR=你的名字
SITE_BIO=这是我的个人博客
```

**注意：**
- `FRONTEND_ORIGIN` 末尾**不要带 `/`**
- `ADMIN_PASSWORD` **必须设置**，否则 seed 会报错
- 其他 `SITE_*`、`SOCIAL_*` 可以不填，进后台后随时可以改

### 第 4 步：一键启动

```bash
# 构建并启动（首次会比较慢，约 5-10 分钟）
docker compose up -d --build
```

等待构建完成后：

```bash
# 查看运行状态
docker compose ps

# 查看日志（确认没有报错）
docker compose logs -f app
```

看到类似 `Ready in xxxms` 就说明启动成功了！

### 第 5 步：初始化数据

```bash
# 进入应用容器
docker compose exec app sh

# 初始化数据库结构
npx prisma db push

# 写入默认数据（创建后台账号等）
npx tsx prisma/seed.ts

# 退出容器
exit
```

### 第 6 步：验证

浏览器打开 `http://你的服务器IP:3000`，应该能看到博客首页。

打开 `http://你的服务器IP:3000/admin`，用你设置的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录后台。

### Docker 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f app

# 重启
docker compose restart app

# 停止
docker compose down

# 更新代码后重新部署
git pull
docker compose up -d --build
```

---

## 方式二：PM2 手动部署

如果你不想用 Docker，或者服务器已经有 PostgreSQL，可以用这种方式。

### 第 1 步：安装系统依赖

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Git（如果还没有）
apt install -y git

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 pnpm（Node.js 包管理器）
npm install -g pnpm

# 安装 PM2（进程管理器，保证应用崩溃后自动重启）
npm install -g pm2

# 验证安装
node -v    # 应该显示 v20.x.x
pnpm -v    # 应该显示 9.x.x 或更高
pm2 -v     # 应该显示 5.x.x 或更高
```

### 第 2 步：安装 PostgreSQL

```bash
# 安装 PostgreSQL
apt install -y postgresql postgresql-contrib

# 启动 PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql -c "CREATE USER sure WITH PASSWORD '你的数据库密码';"
sudo -u postgres psql -c "CREATE DATABASE sure_blog OWNER sure;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sure_blog TO sure;"
```

### 第 3 步：下载项目代码

```bash
# 进入常用目录
cd /opt

# 下载项目
git clone https://github.com/你的用户名/sure.git
cd sure/sure-main
```

### 第 4 步：配置环境变量

```bash
cp .env.example .env
nano .env
```

修改内容和 Docker 方式基本一样，**但 `DATABASE_URL` 要指向本地 PostgreSQL**：

```env
DATABASE_URL=postgresql://sure:你的数据库密码@localhost:5432/sure_blog?schema=public
```

其他变量和 Docker 方式完全一样。

### 第 5 步：运行部署脚本

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署脚本（会自动安装依赖、构建、启动）
./deploy.sh
```

脚本会自动完成：
1. 检测 Node.js / pnpm / PM2
2. 安装项目依赖
3. 构建后台管理页面
4. 初始化数据库
5. 写入默认数据
6. 构建 Next.js 生产版本
7. 用 PM2 启动服务

### 第 6 步：验证

浏览器打开 `http://你的服务器IP:3000`，应该能看到博客首页。

### PM2 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs sure-blog

# 重启
pm2 restart sure-blog

# 停止
pm2 stop sure-blog

# 更新代码后重新部署
git pull
chmod +x deploy.sh && ./deploy.sh
```

---

## 配置 Nginx 反向代理 + HTTPS

不管用哪种方式部署，都**强烈建议**配 Nginx 反向代理 + HTTPS。

### 第 1 步：安装 Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 第 2 步：配置域名 DNS

到你的域名服务商（如 Cloudflare、阿里云、腾讯云）添加 DNS 记录：

| 类型 | 名称 | 值 |
|------|------|-----|
| A | `@` 或 `blog` | `你的服务器IP` |

例如：你要用 `blog.example.com` 访问博客，就添加一条 A 记录，名称填 `blog`，值填服务器 IP。

### 第 3 步：申请 SSL 证书（HTTPS）

```bash
# 安装 certbot
apt install -y certbot python3-certbot-nginx

# 申请证书（替换成你的域名）
certbot --nginx -d 你的域名.com

# 按提示操作：
# 1. 输入邮箱
# 2. 同意条款：Y
# 3. 是否分享邮箱：N 或 Y 都行
# 4. 选 2（Redirect）—— 自动把 HTTP 跳转到 HTTPS
```

### 第 4 步：修改 Nginx 配置

```bash
# 编辑 certbot 自动生成的配置
nano /etc/nginx/sites-available/default
```

在 `server { ... }` 块中，找到 `location / { ... }`，**替换为**：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 关键：禁用缓存，否则部署更新后浏览器会加载旧页面
    proxy_no_cache 1;
    proxy_cache_bypass 1;
    proxy_cache off;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";

    proxy_connect_timeout 30s;
    proxy_read_timeout 86400s;
    proxy_send_timeout 30s;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### 第 5 步：测试并重载

```bash
# 测试配置是否正确
nginx -t

# 如果显示 test is successful，重载配置
nginx -s reload
```

### 第 6 步：验证

打开 `https://你的域名.com`，应该能正常访问博客。

### 第 7 步：修改 GitHub OAuth 回调地址

回到 [GitHub OAuth App 设置](https://github.com/settings/developers)，把 `Authorization callback URL` 改成：

```
https://你的域名.com/api/auth/github/callback
```

### 第 8 步：更新 Vercel 环境变量（如果需要）

如果之前 `FRONTEND_ORIGIN` 填的是 `http://服务器IP:3000`，现在要改成：

```
FRONTEND_ORIGIN=https://你的域名.com
```

Docker 方式：修改 `.env` 后执行 `docker compose restart app`
PM2 方式：修改 `.env` 后执行 `pm2 restart sure-blog`

---

## 常见问题

### Q：浏览器打开一片空白或报错？

1. 查看应用日志：
   - Docker：`docker compose logs -f app`
   - PM2：`pm2 logs sure-blog`
2. 检查 `.env` 里的 `DATABASE_URL` 是否正确
3. 检查数据库是否正常运行

### Q：GitHub 登录报错 `The redirect_uri is not associated with this application`？

OAuth App 的 `Authorization callback URL` 必须是：
```
https://你的域名.com/api/auth/github/callback
```
注意是 `/api/auth/github/callback`，不是 `/auth/callback`。

### Q：上传图片失败？

1. 检查 R2 环境变量是否正确
2. 在 Cloudflare R2 控制台检查桶是否开启了公共访问
3. 检查 `R2_PUBLIC_URL` 是否正确

### Q：更新代码后页面报错？

部署更新后必须重新构建：
```bash
# Docker 方式
git pull
docker compose up -d --build

# PM2 方式
git pull
chmod +x deploy.sh && ./deploy.sh
```

### Q：服务器内存不够用？

Next.js 生产模式大约占 300-500MB 内存。如果服务器只有 1G 内存：
```bash
# 创建 swap 分区（2G）
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Q：部署后页面样式错乱？

很可能是 Nginx 缓存了旧的 HTML。确认 Nginx 配置里有 `proxy_cache off;`，然后：
```bash
nginx -s reload
# 浏览器按 Ctrl+Shift+R 强制刷新
```

### Q：宝塔面板用户怎么部署？

1. 在宝塔面板安装 Node.js 版本管理器，选择 Node 20
2. 在宝塔面板创建 Node 项目，选择项目目录
3. 启动命令填 `pnpm start`
4. 在宝塔的 Nginx 配置里加上面的反向代理配置
5. 注意宝塔有自己的缓存机制，更新后记得重启项目

---

## 更新博客

当仓库有新版本时：

```bash
# 拉取最新代码
git pull

# Docker 方式
docker compose up -d --build

# PM2 方式
chmod +x deploy.sh && ./deploy.sh
```