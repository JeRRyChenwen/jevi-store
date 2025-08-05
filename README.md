This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

=================================================================================================================================================

## 建立数据库

Cloudflare R2 文件存储（类似 AWS S3）
Cloudflare D1 数据库（类似 SQLite / PostgreSQL）

Cloudflare D1 必须运行在 Cloudflare 的 Workers Runtime 环境中

Cloudflare 必须 login

==============================================================
npm run build

D:\前端练习\social-platform>npm run build

> social-platform@0.1.0 build
> next build

▲ Next.js 15.3.4

- Environments: .env

Creating an optimized production build ...
✓ Compiled successfully in 0ms
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (7/7)
✓ Collecting build traces
✓ Exporting (3/3)
✓ Finalizing page optimization

Route (app) Size First Load JS
┌ ○ / 136 B 101 kB
├ ○ /\_not-found 977 B 102 kB
├ ○ /auth/forgot-password 2.27 kB 136 kB
├ ○ /auth/login 2.38 kB 140 kB
└ ○ /auth/register 2.34 kB 136 kB

- First Load JS shared by all 101 kB
  ├ chunks/4bd1b696-a29676be0b8603ec.js 53.2 kB
  ├ chunks/684-68e0da28c4ba777b.js 46 kB
  └ other shared chunks (total) 1.99 kB

○ (Static) prerendered as static content

太好了！🎉 你的 Next.js 项目现在已经：

✅ 成功构建为 静态网站（Static Export）
✅ 每个页面都正确地 预渲染（prerendered as static content）
✅ 没有任何编译或类型错误
✅ 页面体积也很轻量（First Load JS 约 101KB）

✅ 所以，为什么你在 Cloudflare D1 Studio 中没看到数据？
因为你刚刚插入数据的数据库是 本地的 D1 数据库，而不是 Cloudflare 云端数据库。你的前端是通过 wrangler dev 本地运行、连接本地 D1 数据库。

D:\前端练习\social-platform>npx wrangler d1 migrations apply DB_D1 --remote

⛅️ wrangler 4.27.0
───────────────────
▲ [WARNING] Processing wrangler.toml configuration:

    - Unexpected fields found in top-level field: "migrations_dir"

Migrations to be applied:
┌───────────────────────┐
│ name │
├───────────────────────┤
│ 0001_create_users.sql │
└───────────────────────┘
√ About to apply 1 migration(s)
Your database may not be available to serve requests during the migration, continue? ... yes
🌀 Executing on remote database DB_D1 (c25047d3-3051-47b6-93c4-a41cfd09f730):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 2 commands in 0.4662ms
┌───────────────────────┬────────┐
│ name │ status │
├───────────────────────┼────────┤
│ 0001_create_users.sql │ ✅ │
└───────────────────────┴────────┘
