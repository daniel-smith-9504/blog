# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先拷贝依赖文件，利用 Docker 缓存层
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 拷贝后台管理源码
COPY admin/ ./admin/

# 拷贝 Prisma schema
COPY prisma/ ./prisma/

# 拷贝项目源码
COPY . .

# 构建（会依次 build admin → prisma generate → next build）
RUN pnpm build

# ===== 运行阶段 =====
FROM node:20-alpine AS runner

WORKDIR /app

# 设置为生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@latest --activate

# 只拷贝构建产物和运行时需要的文件
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Next.js 默认端口
EXPOSE 3000

# 启动命令：先推送数据库 schema，再启动 Next.js
CMD ["sh", "-c", "npx prisma db push --skip-generate && pnpm start"]
