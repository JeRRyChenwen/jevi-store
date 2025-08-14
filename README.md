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

# ============================================================================

# ============================================================================

User API Tokens
-tesLbMQ9spiOQ4RFcAdgMadNUEQAoo8Ud1C5TFI

# ============================================================================

# ============================================================================

# ============================================================================

千万不要让前端浏览器直接连 D1。正确做法是：

前端网站（React/Next/Vite/任意） ⟶ 调用你的 Worker API ⟶ Worker 在服务器侧访问 D1
这样才能保护数据库凭据、做输入校验、加密密码、设定会话/鉴权等。

下面给你一套「能跑」的最小方案：在你现有的 Worker（purple-pond-3b88）里加注册/登录接口，然后前端直接 fetch 调这些接口。
