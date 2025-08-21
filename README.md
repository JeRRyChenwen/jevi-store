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

# ============================================================================

re-build procedure

# ============================================================================

## 建立数据库

Cloudflare R2 文件存储（类似 AWS S3）
Cloudflare D1 数据库（类似 SQLite / PostgreSQL）

# 1. 安装必要的 packages

### 1.1 认证 wrangler

    ```bash

    # 升级 wrangler（尽量用最新）

    npm i -g wrangler@latest

    # 或者每次都用 npx 最新版

    npx wrangler@latest --version

    # 先退出再登录

    wrangler logout
    wrangler login # 浏览器授权
    wrangler whoami # 确认账号 & Account ID

    ```

### 1.2 切换到新 Node 版本

    ```bash

    nvm install 22
    nvm use 22
    node -v     # 确认 >= 22.x
    npm -v

    ```

# 2. 在 Cloudflare 里的 dashboard 中创建 D1 database

# 3. 全局安装 wrangler

### 3.1 创建 worker，首先在项目根目录中创建新的文件夹，然后运行下面命令

    ```bash

    mkdir d1-worker
    cd d1-worker
    npx wrangler@latest init --yes

    # 会生成一个类似 purple-pond-3b88 的文件夹，里面包含worker项目的代码文件

    ```

### 3.2 修改 src/index.ts 文件

### 3.3 修改 wrangler.jsonc 文件

### 3.4 部署

    ```bash

    npx wrangler deploy

    ```

# 4. 生成并应用迁移（建表）

### 4.1 生成首个迁移文件，在 d1-worker\purple-pond-3b88 下运行

    ```bash

    # 生成首个迁移文件（名字用你的 D1：socialplatform）
    npx wrangler d1 migrations create socialplatform init

    ```

### 4.2 定义 migrations/0001_init.sql 文件的内容，并且应用到云端数据库，在 d1-worker\purple-pond-3b88 下运行

    ```bash

    -- Migration number: 0001 	 2025-08-11T12:02:30.224Z
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    ```

### 4.3 应用到云端数据库，表结构迁移到 D1 数据库，在 d1-worker\purple-pond-3b88 下运行

    ```bash

    npx wrangler d1 migrations apply socialplatform --remote

    ```

### 4.4 立刻验证一下表是否真的存在，在 d1-worker\purple-pond-3b88 下运行：

    ```bash

    npx wrangler d1 execute socialplatform --remote --command "SELECT name FROM sqlite_master WHERE type='table';"

    ```

### 4.5 确认迁移文件是否已经被识别以及应用，在 d1-worker\purple-pond-3b88 下运行：

    ```bash

    npx wrangler d1 migrations list socialplatform --remote

    # 如果migrations list 把 0001_init.sql 列出来，说明迁移文件已被识别但还没应用（pending）

    ```

### 4.6 如果遇到 Authentication error [code: 10000] 问题，说明不是 SQL 或表结构问题，而是 CLI 身份验证在调用 D1 API 时抽风，记得在 wrangler.jsonc 文件里加上：

    ```bash

    "account_id": "d630a9134d372effc55323cfec6f68a5"

    ```

### 4.7 重新登录并刷新凭证：

    ```bash

    npx wrangler logout
    npx wrangler login

    ```

### 4.7 执行下面的命令再检查一次：

    ```bash

    npx wrangler d1 execute socialplatform --remote --command "SELECT name FROM sqlite_master WHERE type='table';"

    # 如果一切正常，就应该能看到 users 表了

    ```

# 5. 应用 cloudflare 的 API token

### 5.1 在 cloudflare 中 创建 API token：

    ```bash

    1. 登录 cloudflare dashboard
    2. 进入 profile 页面
    3. 进入 API token 页面
    4. 点击 create token，然后点击 create custom token
    5. 新建一个权限完整的 API Token
    6. 权限 Account → D1 Databases → Edit ✅（访问/写入 D1 必需）
    7. 权限 Account → Account Settings → Read ✅（让 API 能读取账号基础信息，避免 7403）
    8. 权限 User → User Details → Read 〔可选〕（whoami 才能显示邮箱，不加也不影响执行）
    9. 权限 Account → Workers Scripts → Edit（以后 wrangler 部署/脚本操作更顺）
    10. Account Resources：选择 Include → Specific accounts → 勾选你的账号（ID：d630a9...），或者直接 All accounts
    11. Client IP Filtering / TTL：都留空（不限制 IP，不限时）

    ```

### 5.2 再次检测：

    ```bash

    set CLOUDFLARE_API_TOKEN=-tesLbMQ9spiOQ4RFcAdgMadNUEQAoo8Ud1C5TFI
    set CLOUDFLARE_ACCOUNT_ID=d630a9134d372effc55323cfec6f68a5

    npx wrangler whoami

    npx wrangler d1 execute socialplatform --remote --command "INSERT INTO users (email, name) VALUES ('jerry@example.com','Jerry');"

    npx wrangler d1 execute socialplatform --remote --command "SELECT id,email,name,created_at FROM users ORDER BY id DESC LIMIT 5;"

    ```

### 5.3 用 .env 文件保存环境变量：

    ```bash

    CLOUDFLARE_API_TOKEN=-tesLbMQ9spiOQ4RFcAdgMadNUEQAoo8Ud1C5TFI
    CLOUDFLARE_ACCOUNT_ID=d630a9134d372effc55323cfec6f68a5

    然后可以再次检测：

    npx wrangler d1 execute socialplatform --remote --command "SELECT * FROM users;" --env-file=.env


    ```

# 6. 前端表单 ➜ 调 Worker API ➜ Worker 写入 D1 （不要让浏览器直接连 D1）

    ```bash

    把“前端 → 你的 Cloudflare Worker API → D1”这条链路串起来就行。核心原则：前端永远不要直接连 D1，所有写入都走 Worker（后端）来做密码哈希、校验、入库。


    ```

### 6.1 首先如果要修改 table 的话，第一种选择在 d1-worker 仓库 里创建一个新迁移，第二种选择则是直接在 d1-worker 仓库 里的原有的迁移中进行修改，也就是删表重建（但如果原有的数据库中已经存在数据的话就不行）

    ```bash

    之所以要在 d1-worker 仓库 里创建一个新迁移，是因为 D1 数据库是结构化的，它和 MySQL、PostgreSQL 一样，需要明确的表结构（Schema）。迁移（migration）就是用来记录并应用数据库结构变更的。

    在 D1（或者 MySQL、PostgreSQL 这些关系型数据库）里，每次你对表结构有改动，都应该新建一个迁移文件，而不是直接去改之前的迁移文件。

    如果你决定删表重建的话：


    # 进入 d1-worker 目录
    # 删除数据库（慎用，会清空所有表）
    npx wrangler d1 execute socialplatform --remote --command "DROP TABLE IF EXISTS users;"

    # 同时删除迁移记录（可选，如果要重新执行 0001）
    npx wrangler d1 execute socialplatform --remote --command "DELETE FROM d1_migrations WHERE name='0001_init.sql';"

    # 重新跑 0001_init.sql
    npx wrangler d1 migrations apply socialplatform --remote


    同时如果你想修改 0001_init.sql 文件名的话：

    Cloudflare D1 的迁移文件命名规则
    D1 的迁移是靠 文件名中的编号（0001, 0002, …） 来识别执行顺序的。
    文件名的后半部分（比如 _init.sql）只是你自己起的描述名，D1 并不强制要求固定写法。
    例如：
    0001_init.sql
    0001_d1_init.sql
    0001_create_users.sql
    这些效果完全一样，只要前缀编号没变。


    ```

### 6.2 在 Worker 里新增“注册”接口，在 d1-worker 里（src/index.ts），加入一个 /auth/register 路由

    ```bash
    在前端中 发送信息到下面的网址：
    NEXT_PUBLIC_API_BASE=http://127.0.0.1:8787


    我们可以创建一个 .env.local 文件来储存 NEXT_PUBLIC_API_BASE 这个变量

    ✅ .env.local
    专门用于本地开发。
    里面的值往往是：http://127.0.0.1:8787、http://localhost:3000 这种本地地址。
    .env.local 默认不会被 git 提交（因为 .gitignore 里一般忽略了它），这样你就不会把本地配置上传到代码仓库。


    ✅ .env.production
    专门用于生产部署（线上环境）。
    里面写的是你的真实线上 Worker/API 地址，比如：
    NEXT_PUBLIC_API_BASE=https://social-platform.yourdomain.com
    在部署到 Cloudflare Pages / Vercel / Netlify 等环境时，可以让 CI/CD 自动加载这个文件。

    ```

### 6.3 在 前端（social-platform 仓库） 的注册页里调用这个接口并提交到 Worker

    ```bash
    worker 监听下面的网址的请求（调试阶段用本地网址）：
    FRONTEND_ORIGIN = "http://localhost:3000";

    ```

### 6.4 如果你要修改 0001_init.sql 文件名的话，需要检测是否识别到你要应用的新的迁移 0001_d1_init.sql 文件

    ```bash

    npx wrangler d1 migrations list socialplatform --remote

    如果识别成功就运行下面的代码应用迁移：
    npx wrangler d1 migrations apply socialplatform --remote
    # 查看 users 列定义
    npx wrangler d1 execute socialplatform --remote --command "PRAGMA table_info(users);"


    验证触发器是否存在：
    npx wrangler d1 execute socialplatform --remote --command "SELECT name, sql FROM sqlite_master WHERE type='trigger';"

    # 如果想显示table里的所有内容的话可以运行
    npx wrangler d1 execute socialplatform --remote --command "SELECT * FROM users WHERE email='test@example.com';"

    ```

### 6.5 在 前端（social-platform 仓库） 的注册页里调用这个接口并提交到 Worker

    ```bash
    worker 监听下面的网址的请求（调试阶段用本地网址）：
    FRONTEND_ORIGIN = "http://localhost:3000";

    ```

### 6.6 测试，前端本地 + Worker 本地预览（推荐开发期）

    ```bash

    在 d1-worker 项目里运行：
    npx wrangler dev --x-remote-bindings

    在 前端 项目里运行：
    npm run dev

    ```

### 6.7 在测试的时候，特别是账号注册测试的时候，弱/重复使用的密码会导致 Google Password Manager 的提醒

# ============================================================================

# ============================================================================

User API Tokens
-tesLbMQ9spiOQ4RFcAdgMadNUEQAoo8Ud1C5TFI

# ============================================================================

# ============================================================================

# ============================================================================

npm run dev

npx wrangler dev --x-remote-bindings
