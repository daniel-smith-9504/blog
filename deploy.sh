#!/bin/bash

# =============================================
# sure 博客 服务器一键部署脚本
# 适用系统：Ubuntu / Debian / CentOS
# 使用方式：chmod +x deploy.sh && ./deploy.sh
# =============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  sure 博客 服务器部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ---- 1. 检测系统环境 ----
echo -e "${YELLOW}[1/7] 检测系统环境...${NC}"

# 检测 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}未检测到 Node.js，正在安装 Node.js 20...${NC}"
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
        sudo yum install -y nodejs
    else
        echo -e "${RED}无法自动安装 Node.js，请手动安装 Node.js 20+${NC}"
        exit 1
    fi
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo -e "  Node.js 版本: $(node -v)"

if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Node.js 版本过低，需要 20+，当前: $(node -v)${NC}"
    exit 1
fi

# 检测 pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}  未检测到 pnpm，正在安装...${NC}"
    npm install -g pnpm
fi
echo -e "  pnpm 版本: $(pnpm -v)"

# 检测 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}  未检测到 PM2，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "  PM2 版本: $(pm2 -v)"
echo ""

# ---- 2. 检测 .env 文件 ----
echo -e "${YELLOW}[2/7] 检测环境变量配置...${NC}"

if [ ! -f .env ]; then
    echo -e "${RED}未找到 .env 文件！${NC}"
    echo -e "${YELLOW}请先复制 .env.example 并填写你的配置：${NC}"
    echo -e "  cp .env.example .env"
    echo -e "  nano .env"
    exit 1
fi
echo -e "  .env 文件已找到"
echo ""

# ---- 3. 安装项目依赖 ----
echo -e "${YELLOW}[3/7] 安装项目依赖...${NC}"
pnpm install --frozen-lockfile
echo ""

# ---- 4. 构建后台管理 ----
echo -e "${YELLOW}[4/7] 构建后台管理页面...${NC}"
cd admin
npm install --include=dev
npm run build
cd ..
echo ""

# ---- 5. 生成 Prisma Client 并推送数据库结构 ----
echo -e "${YELLOW}[5/7] 初始化数据库...${NC}"
npx prisma generate
npx prisma db push --skip-generate
echo ""

# ---- 6. 写入初始数据 ----
echo -e "${YELLOW}[6/7] 写入初始数据（seed）...${NC}"
echo -e "${YELLOW}  如果数据库已有数据，seed 会跳过${NC}"
npx tsx prisma/seed.ts || echo -e "${YELLOW}  seed 已执行（如已存在则跳过）${NC}"
echo ""

# ---- 7. 构建 Next.js 生产版本 ----
echo -e "${YELLOW}[7/7] 构建 Next.js 生产版本...${NC}"
npx next build
echo ""

# ---- 启动 PM2 ----
echo -e "${GREEN}构建完成！正在使用 PM2 启动服务...${NC}"

# 停止旧进程（如果存在）
pm2 delete sure-blog 2>/dev/null || true

# 启动新进程
pm2 start ecosystem.config.js
pm2 save

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  访问地址: http://你的服务器IP:3000"
echo -e "  后台地址: http://你的服务器IP:3000/admin"
echo ""
echo -e "${YELLOW}常用命令：${NC}"
echo -e "  查看日志:  pm2 logs sure-blog"
echo -e "  重启服务:  pm2 restart sure-blog"
echo -e "  停止服务:  pm2 stop sure-blog"
echo -e "  查看状态:  pm2 status"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo -e "  1. 配置 Nginx 反向代理（参考 nginx.conf.example）"
echo -e "  2. 配置 SSL 证书（推荐用 certbot）"
echo -e "  3. 开放防火墙 80/443 端口"
echo ""