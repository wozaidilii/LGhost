# L-Ghost

Loamly 出品的 L-Ghost — 日文 AI 电话客服 MVP，学资保险合同确认场景。

## 技术栈

- [T3 Stack](https://create.t3.gg/) — Next.js, tRPC, Prisma, NextAuth, Tailwind
- OpenAI Realtime API — 浏览器 WebRTC 语音对话
- Google OAuth — 用户登录

## 功能

- Google 登录管理后台
- 学资保险契约列表与详情
- 浏览器内 AI 语音确认通话（模拟外呼）
- 身份确认 → 契约内容确认 → FAQ 问答 → 状态更新/转人工
- 通话转写与历史记录

## 快速开始

### 1. 环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
AUTH_SECRET=          # npx auth secret
AUTH_GOOGLE_ID=       # Google Cloud Console OAuth
AUTH_GOOGLE_SECRET=
OPENAI_API_KEY=       # OpenAI Realtime API
DATABASE_URL=postgresql://postgres:password@localhost:5432/L-Ghost
```

### 3. 生产数据库（Neon）— 必须用独立库

⚠️ **不要与 histroguessr 等项目共用 `neondb` 数据库**，否则 `db push` 会删除现有表。

1. 打开 [Neon Console](https://console.neon.tech) → 你的 Project
2. **Databases → Create database** → 名称例如 `lghost`
3. 复制新库的 Connection string（pooled）
4. 写入本地 `.env.neon`（已 gitignore）：

```bash
DATABASE_URL=postgresql://...@.../lghost?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://...@.../lghost?sslmode=require
```

5. 在 **Vercel → l-ghost → Settings → Environment Variables** 更新 `DATABASE_URL` 指向 `/lghost`
6. 初始化：

```bash
npm run db:push:prod
npm run db:seed:prod
vercel --prod   # Redeploy
```

### 3. 开发

```bash
npm run dev
```

访问 http://localhost:3000

## Demo 流程

1. Google 登录
2. 契約一覧 → 田中 太郎 様
3. 「確認通話を開始」→ 允许麦克风
4. AI 用日语主动开场，确认契约内容

## 项目结构

```
src/
  app/(dashboard)/     # 管理后台页面
  components/voice/    # WebRTC 语音组件
  lib/voice/           # Prompt、Tools、Realtime 客户端
  server/api/routers/  # tRPC 路由
```
