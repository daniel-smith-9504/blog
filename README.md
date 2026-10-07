# Sure の小站

基于 [Starhiro](https://github.com/Xinghongia) 开源博客项目进行二次开发与个性化修改的个人博客。

注意：本项目仅为个人开发使用，有一定魔改内容，不建议普通用户（懂代码的也不建议）使用，因为本项目为了方便，在数据库内与源代码之中内嵌了许多个人内容，所以不建议你使用。

vercel部署请使用 [ddmer-1](https://github.com/wryygx/ddmer-1)，使用服务器部署请使用 [Starhiro](https://github.com/Xinghongia)部署。

## 技术栈

- **前端框架：** Next.js 15 + React 19
- **样式方案：** Tailwind CSS 3
- **UI 组件：** shadcn/ui + Framer Motion
- **设计语言：** Glassmorphism（玻璃拟态）
- **后端集成：** Next.js API Routes + Prisma ORM
- **数据库：** SQLite
- **认证方案：** GitHub OAuth + 匿名用户（JWT）
- **管理后台：** Vue 3 + Element Plus
- **特效系统：** 点击特效、鼠标轨迹、季节特效、星星迸发
- **其他功能：** Live2D 看板娘、网易云音乐播放器、图片懒加载
- **开发语言：** TypeScript

## 功能特性

- 文章发布与管理（Markdown 编辑器）
- 说说/动态发布
- 照片墙与相册管理
- 留言板（支持 GitHub 登录 + 匿名留言）
- 文章评论系统
- 友链管理
- 项目展示
- 收藏夹管理
- 站点配置后台管理
- 音乐播放器
- Live2D 看板娘交互
- 个性化背景与主题

## 开发

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma migrate dev
npx prisma db seed

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署

- **Vercel 部署：** 参考 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 相关链接

- **原项目作者 GitHub：** [github.com/Xinghongia](https://github.com/Xinghongia)
- **原项目主页：** [Starhiro の小站](https://hiromu.top)

> 基于开源，致敬原创