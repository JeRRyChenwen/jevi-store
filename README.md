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

### 6.8 在 d1-worker 中新增 /auth/login，因为你现在用的是 静态导出 的 Next 项目，/api/login 不存在，前端必须改为调用 Worker 的 /auth/login

    ```bash

    把 fetch("/api/login") 改为 fetch(\${API_BASE}/auth/login`)`

    用环境变量 NEXT_PUBLIC_API_BASE 指向你的 Worker（开发：http://127.0.0.1:8787）

    密码校验与后端对齐到 至少 8 位

    兼容后端返回的 { error: "..." } 与 { ok: true, user } 结构

    成功后把非敏感 user 存到 localStorage 以便 Navbar 展示（后续可升级为 Cookie/JWT）

    ```

### 6.9 在前端新增/修正登录页

### 6.10 如果报错 500 （internal server error）

    ```bash

    把 fetch("/api/login") 改为 fetch(\${API_BASE}/auth/login`)`

    用环境变量 NEXT_PUBLIC_API_BASE 指向你的 Worker（开发：http://127.0.0.1:8787）

    密码校验与后端对齐到 至少 8 位

    兼容后端返回的 { error: "..." } 与 { ok: true, user } 结构

    成功后把非敏感 user 存到 localStorage 以便 Navbar 展示（后续可升级为 Cookie/JWT）

    ```

### 6.11 确认是否全局安装” Wrangler

    ```bash

    cd "D:\前端练习\d1-worker"

    :: 1) 用 npx 调 wrangler（无需全局安装）
    npx wrangler -v

    :: 2) 查看你的 D1 数据库名字（确认是 socialplatform）
    npx wrangler d1 list

    :: 3) 应用迁移到本地（dev 用）——确保有 users 表
    npx wrangler d1 migrations apply socialplatform --local

    :: 4) 验证表是否存在
    npx wrangler d1 execute socialplatform --local --command "SELECT name FROM sqlite_master WHERE type='table';"

    :: 5) 看 users 列定义
    npx wrangler d1 execute socialplatform --local --command "PRAGMA table_info(users);"

    :: 6) 启动本地开发 Worker
    npx wrangler dev

    ------------------------------------------------------------------------
    想要“永久可用”的全局安装（可选）
    如果你希望 wrangler 这个命令在任何终端都能用：

    npm i -g wrangler@latest
    wrangler -v

    ------------------------------------------------------------------------
    应用本地 D1 迁移（创建 users 表）
    cd "D:\前端练习\d1-worker"

    :: 查看你的 D1 实例名（确认是不是 socialplatform）
    wrangler d1 list

    :: 把迁移应用到本地开发数据库
    wrangler d1 migrations apply socialplatform --local

    ------------------------------------------------------------------------
    验证表是否真的存在
    wrangler d1 execute socialplatform --local --command "SELECT name FROM sqlite_master WHERE type='table';"
    wrangler d1 execute socialplatform --local --command "PRAGMA table_info(users);"

    ------------------------------------------------------------------------
    升级到最新 wrangler（推荐）
    cd "D:\前端练习\d1-worker"

    :: 确认 npx 用的版本
    npx wrangler -v   :: 如果还是 4.28.x，继续下面两步

    :: 把 wrangler 加到项目 devDependency，并用 npx 调用本地版本
    npm i -D wrangler@4.31.0

    :: 本地开发（连本地 D1）
    npx wrangler dev --local


    ```

# 7. 登录状态功能

### 7.1 下面是一份“从 0 到能用”的登录 + 登录态实现流程说明，覆盖你的两个项目：d1-worker（Cloudflare Worker + D1）和 social-platform（Next.js 前端）

    ```bash
    1. 用户在前端 /auth/login 输入邮箱/密码 →

    2. POST ${API_BASE}/auth/login（携带 credentials: 'include'）→

    3. Worker 校验密码，签发 JWT，通过 HttpOnly Cookie sp_session 返回，并额外下发一个可读的 存在标记 Cookie sp_has_session=1 →

    4. 前端登录页轮询一次 /auth/me 确认会话可用，发送 window.dispatchEvent(new Event('sp-auth-changed')) →

    5. Navbar 监听该事件并调用 /auth/me 获取用户，显示“Hi, Jerry” →

    6. 退出登录时 POST /auth/logout，服务端清空这两个 Cookie，前端刷新 UI 并跳转登录页。
    ```

### 7.1 登录状态持续时间

刷新页面后还能保持“已登录”，是因为浏览器保存了你的 HttpOnly 会话 Cookie（sp_session）。只要这个 Cookie（以及其中 JWT 的 exp）还没过期，你就仍然是登录状态。你现在的实现里，两者都设成 7 天，所以半小时后回来当然还在，不需要重新登录。

你项目里“登录状态能保持多久？
看 d1-worker 的两处地方——你已经写好了（数值都是“7 天”）：

    ```bash
    1. JWT 过期时间（登录时签发）

    const now = Math.floor(Date.now() / 1000);
        const payload = {
        sub: String(r.id),
        email: r.email,
        name: (r.name as string) ?? null,
        iat: now,
        exp: now + 7 * 24 * 3600,   // ← 7 天
    };

    2. 会话 Cookie 的存活时间（Set-Cookie）

    // buildSessionCookie(...)
    "Max-Age=" + 7 * 24 * 3600,   // ← 7 天
    // 以及可读标志 sp_has_session 也同样是 7 天


    ```

# 8. 忘记密码/重置密码功能

### 8.1 “忘记密码/重置密码”这条链路需要一个一次性、短期有效、可并发管理的“凭证”（token）。把它放在单独的表里比塞进 users 表更安全、好维护，也更容易做审计与清理

    ```bash
    忘记密码（未登录）：用户只提供邮箱，我们要：

    1. 生成一次性 token（可多次申请、多端并发），

    2. 设定过期时间（比如 30 分钟），

    3. 只在「用户点了邮件里的链接」时才允许修改密码，

    4. 使用后作废（防重放），

    5. 能做审计与清理（过期/已用）。
    这些需求天然就像“工单”或“会话记录”，独立表最合适。

    6. 修改密码（已登录）：用户提供旧密码 + 新密码，验证通过后直接更新 users 表即可（这不需要额外表）。
    ```

# 9. 购买自己的域名，用于发邮件

    ```bash
    大致要花多少钱取决于你选的后缀（TLD）。给你用 Cloudflare Registrar（按“成本价”卖） 的最新价格区间当参考：

    .com：约 US$10.44/年（便宜、通用）。
    Cloudflare Domain Pricing

    .xyz：约 US$11.18/年（价格接近 .com）。
    Cloudflare Domain Pricing

    .org：注册约 US$7.50、续费 US$10.11/年。
    Cloudflare Domain Pricing

    .net：约 US$11.84/年。
    Cloudflare Domain Pricing

    .io：约 US$45/年。
    Cloudflare Domain Pricing

    .ai：约 US$70/年（偏贵）。
    Cloudflare Domain Pricing
    ```

# 10. 创建一个新的 mailer-api 项目，也就是说要创建一个发邮件的 api

    ```bash
    推荐架构（稳 & 易扩展）

    1. 两个独立 Worker

    d1-api：你的业务 API（注册、登录、D1 操作）

    mailer-api：专职发邮件

    2. Service Binding（强烈推荐）

    在 Cloudflare 内网把 mailer-api 绑定到 d1-api，无需暴露公网，安全又省心。

    3. 邮件服务用 HTTP 提供商

    Workers 不支持原生 SMTP，选 Resend / SendGrid / Mailgun 这类 HTTP API。

    入门建议：Resend，API 简洁、模板好维护。
    ```

# 11. 创建一个 Strapi 开源自托管版（Community Edition）

    ```bash
    用 Strapi 开源自托管版（Community Edition） 就能满足你“上新/打折/排序/图文管理”的需求，而且和你现在的栈（Next.js 前端 + Cloudflare Workers + D1 + mailer-api）非常搭

    运行下面命令启动：
    npm run develop

    如果想以“生产模式”启动（更稳定，后台不热重载）：
    npm run build
    npm run start

    ```

# 12. 数据库储存结构

### 12.1 订单储存结构

    ```bash
    下面是三张表（orders、order_items、order_payments）中每个列（column）的“用途说明 + 类型/取值建议 + 备注”。我按表 → 列名：含义的格式写，方便你直接复制粘贴进文档里使用（无表格）。

    orders（订单主表）

    id：数据库自增主键。
    类型：INTEGER PRIMARY KEY AUTOINCREMENT。
    备注：内部用，不对外暴露；用于与 order_items、order_payments 关联。

    order_no：对外展示的订单编号。
    类型：TEXT UNIQUE。
    用途：给用户/客服/对账使用的人类可读订单号，比如 SP20251012-000123。
    生成：通常在插入订单后由后端基于 id 与日期生成并回写。

    user_id：下单用户的 users.id。
    类型：INTEGER（可空）。
    用途：关联已注册用户；游客下单为 NULL。
    外键：FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL。

    email：联系邮箱（下单邮箱）。
    类型：TEXT NOT NULL。
    用途：发送确认邮件、作为游客识别辅助；即使已登录也冗余存一份快照。

    status：订单状态。
    类型：TEXT NOT NULL，默认 'paid'。
    典型取值：'pending' | 'paid' | 'failed' | 'refunded' | 'canceled' | 'closed' 等。
    备注：最小可用可以只用 'paid'，后续按业务扩展。

    currency：货币代码。
    类型：TEXT NOT NULL。
    取值：ISO 4217（如 'AUD'、'USD'、'CNY'）。
    备注：与价格字段一起使用，统一以该货币结算。

    items_total_minor：商品小计（分）。
    类型：INTEGER NOT NULL。
    含义：所有行项目小计的“最小货币单位”总和，比如 AUD 的 1760 表示 17.60 AUD。
    备注：不要存浮点数，统一用整数最小单位。

    delivery_fee_minor：运费（分）。
    类型：INTEGER NOT NULL，默认 0。
    含义：运费金额（最小单位），免运费则为 0。

    tax_minor：税费（分）。
    类型：INTEGER NOT NULL，默认 0。
    含义：订单层面的税额（最小单位）。如已含税可保持 0。

    discount_minor：折扣（分）。
    类型：INTEGER NOT NULL，默认 0。
    含义：订单层面的优惠合计（最小单位），为正值表示减少金额。
    备注：行级折扣已体现在 order_items.price_minor 里时，这里可为 0。

    grand_total_minor：订单总额（分）。
    类型：INTEGER NOT NULL。
    含义：应付/实付的合计金额（最小单位），通常 = items_total_minor + delivery_fee_minor + tax_minor - discount_minor。
    备注：与支付方金额对齐非常关键。

    delivery_method：配送方式。
    类型：TEXT（可空）。
    取值示例：'standard' | 'express' | 'pickup'。
    备注：存快照，避免后续配置变化影响历史订单。

    shipping_address_json：收货地址快照（JSON）。
    类型：TEXT（可空）。
    内容示例：{"firstName":"A","lastName":"B","line1":"...","city":"...","postcode":"...","country":"..."}。
    备注：下单当时的地址快照，不依赖用户资料变更。

    billing_address_json：账单地址快照（JSON）。
    类型：TEXT（可空）。
    用途：与配送地址可能不同；若相同可重复存或置空。

    cart_snapshot_json：购物车快照（JSON）。
    类型：TEXT（可空）。
    用途：可选；存下单时前端购物车结构的原样快照，方便排查问题。

    payment_provider：支付渠道标识。
    类型：TEXT NOT NULL。
    取值示例：'paypal-braintree' | 'stripe' | 'adyen'。
    备注：用于多支付通道时区分来源。

    payment_id：第三方支付的交易号/ID。
    类型：TEXT NOT NULL。
    用途：与支付网关对账，作为幂等键之一。
    索引：唯一索引 ux_orders_payment_id，防止重复入库。

    idempotency_key：幂等键（应用层）。
    类型：TEXT（可空）。
    用途：前端或服务端生成（如 crypto.randomUUID()），用于网络重试去重。
    索引：唯一索引（可选）ux_orders_idem，允许为 NULL。

    created_at：创建时间（秒）。
    类型：INTEGER NOT NULL，默认 strftime('%s','now')。
    备注：UNIX 时间戳（秒）。

    updated_at：更新时间（秒）。
    类型：INTEGER NOT NULL，默认 strftime('%s','now')。
    备注：更新时请同步写入当前时间。

    索引建议：

    CREATE UNIQUE INDEX ux_orders_payment_id ON orders(payment_id);

    CREATE UNIQUE INDEX ux_orders_idem ON orders(idempotency_key);

    CREATE INDEX idx_orders_user ON orders(user_id);

    order_items（订单行项目）

    id：数据库自增主键。
    类型：INTEGER PRIMARY KEY AUTOINCREMENT。
    用途：内部标识。

    order_id：所属订单的 orders.id。
    类型：INTEGER NOT NULL。
    外键：FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE。
    备注：级联删除订单时自动删除行项目。

    product_id：商品/变体在商品系统（如 Strapi）的标识。
    类型：TEXT（可空）。
    示例："strapi:products:123" 或具体变体 ID。
    备注：用 TEXT 更灵活，避免跨系统耦合。

    sku：库存单位编码。
    类型：TEXT（可空）。
    用途：对接仓储/发货时常用；没有可留空。

    title：商品标题（快照）。
    类型：TEXT NOT NULL。
    用途：下单时的标题快照，商品后改名也不影响历史订单。

    variant：规格描述。
    类型：TEXT（可空）。
    示例："Size 42 / Chocolate"；无规格可留空。

    qty：购买数量。
    类型：INTEGER NOT NULL。
    备注：应为正整数。

    price_minor：单价（分）。
    类型：INTEGER NOT NULL。
    含义：行级“最终成交价”的单件价格（最小单位），已包含行级折扣/促销后的结果。
    备注：避免浮点；保存下单当时的价格快照。

    subtotal_minor：行小计（分）。
    类型：INTEGER NOT NULL。
    含义：通常等于 price_minor * qty（最小单位）。
    备注：冗余存储便于查询统计，注意与 qty/price_minor 保持一致。

    meta_json：附加元数据（JSON）。
    类型：TEXT（可空）。
    示例：{"image":"...","category":"Shoes","attributes":{"color":"Chocolate","size":"42"}}。

    索引建议：

    CREATE INDEX idx_order_items_order ON order_items(order_id);

    order_payments（支付明细，推荐但可选）

    id：数据库自增主键。
    类型：INTEGER PRIMARY KEY AUTOINCREMENT。
    用途：内部标识。

    order_id：关联订单 orders.id。
    类型：INTEGER NOT NULL。
    外键：FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE。
    用途：同一订单可能有多次支付尝试/部分退款等。

    provider：支付渠道标识。
    类型：TEXT NOT NULL。
    示例：'paypal-braintree' | 'stripe' | 'adyen'。
    备注：与 orders.payment_provider 一致或更细粒度。

    payment_id：第三方支付交易号/ID。
    类型：TEXT NOT NULL UNIQUE。
    用途：对账用；唯一保证同一支付不重复写入。

    amount_minor：本次支付金额（分）。
    类型：INTEGER NOT NULL。
    用途：单次授权/扣款/退款的金额（最小单位）。
    备注：对于部分退款/多次扣款等场景很有用。

    currency：货币代码。
    类型：TEXT NOT NULL。
    取值：ISO 4217（如 'AUD'）。
    备注：应与订单币种一致；跨币种极少见，建议避免。

    status：支付状态。
    类型：TEXT NOT NULL。
    典型取值：'authorized' | 'captured' | 'paid' | 'failed' | 'voided' | 'refunded' | 'partially_refunded'。
    备注：按实际网关语义映射。

    raw_payload_json：网关返回的原始负载（JSON）。
    类型：TEXT（可空）。
    用途：保存支付成功/失败的完整响应，便于排障与对账审计。
    备注：注意敏感信息（如卡号/token）遮蔽或遵守合规。

    created_at：创建时间（秒）。
    类型：INTEGER NOT NULL，默认 strftime('%s','now')。
    用途：记录每一次支付事件时间线。

    索引建议：

    CREATE UNIQUE INDEX 已在 payment_id 上；如需查询订单维度流水，还可：
    CREATE INDEX idx_order_payments_order ON order_payments(order_id);（可选）

    交叉与实现建议（非列，但很重要）

    最小货币单位（*_minor）：所有金额统一存整数，单位为“分/最小单位”。展示时再除以 100 并格式化，避免浮点误差。

    幂等：至少用 orders.payment_id 唯一；如果前端会重试请求，建议同时携带 idempotency_key 并在 orders 上加唯一索引。

    快照字段：title/price_minor/variant、shipping_address_json、billing_address_json 都是下单时快照，与商品/用户后续变动解耦。

    游客支持：orders.user_id 允许 NULL，但 email 必填；如后续用户注册，可通过邮箱或订单号在用户中心做“认领/绑定”流程。

    对账：orders.payment_id ↔ 网关后台；order_payments.raw_payload_json 保留证据链。

    数据更新：orders.updated_at 请在状态或金额变更时刷新；order_items 一般下单后不再改动。

    删除策略：生产上通常不允许硬删除历史订单；若必须删除，使用 ON DELETE CASCADE 能确保行项目/支付记录被一致清理，但请谨慎。

    如果你需要，我可以基于你当前 Worker，直接补一个 /orders 的入库接口（带幂等校验），并给出“可粘贴”的完整代码与一个 SQL 迁移文件。


    ```


    ```bash
    为什么这样设计？


    支持游客：user_id 可空，同时把 email、地址快照、商品价格快照都落库，订单可独立完整复现。

    幂等安全：对 payment_id（如 Braintree/PayPal 的交易号）建唯一索引；可额外使用 idempotency_key 处理前端/网络重试。

    回溯价目：行项目保存当时价格与标题，后续改价或下架也不影响历史订单。

    扩展性：未来要做退款、部分退款、拆单、重新发货，有 order_payments/status 就比较好演进。


    ```

### 12.2 订单储存结构

# ============================================================================

# ============================================================================

User API Tokens
-tesLbMQ9spiOQ4RFcAdgMadNUEQAoo8Ud1C5TFI

# ============================================================================

npm run dev

npx wrangler dev --x-remote-bindings

wrangler dev --port 8789

npm run develop

脚本运行命令：

npm run gen:variants:dry

npm run gen:variants

http://lvh.me:3000/

ENABLE_STRIPE=false

如果要在 D1 数据库中建立新的表：
首先添加新的文件到 migrations 文件夹

关掉正在运行的 dev 进程（如果有）

删除本地 D1 数据库缓存目录（Windows 下在项目根）：
rmdir /s /q .wrangler\state\v3\d1

wrangler d1 migrations apply socialplatform
wrangler d1 migrations apply socialplatform --remote
wrangler d1 migrations apply socialplatform --local

==================================================================

清库

wrangler d1 execute socialplatform --remote --file=reset.sql

==================================================================

await fetch('/api/auth/login', {
method: 'POST',
headers: {'content-type':'application/json'},
credentials: 'include', // 一定要有！
body: JSON.stringify({ login: 'lancechen1998@gmail.com', password: 'Cwxzhasdk1234' })
}).then(r => r.json()).then(console.log)

最标准的 Braintree Sandbox 测试卡：
Card Number：4111111111111111
Expiration Date：12/30（任何未来日期都行）
CVV：123（任何 3 位数都行）

其它常用品牌：
Visa 4111 1111 1111 1111 任意三位，例如 123
MasterCard 5555 5555 5555 4444 任意三位
AMEX 3782 822463 10005 任意四位 CVV，例如 1234

# ============================================================================

# ============================================================================

### 笔记：

New In, Women, Men, Beauty, Home, Travel & Tech, Kids, Toys, Gifts, Sale, Myer one

Category: Shoes, Bottoms, Tops, Suit, Accessories, Outfit

Sub-Category: Causal, Formal, long sleeve, short sleeve

Filter: New Arrival, Sale

要分割出css文件

deploy 的时候保留本地测试的 localhost

很好！然后我还想修改一下我的个人资料页面，也就是我的 profile 页面
My Fit Preferences
Gift Card

一步步传递」链路就真正闭环了（BagDrawer → Checkout → Bag/Address/Delivery → Payment 都吃同一份 cart/地址/配送选择
BagDrawer 显示 real_price ✅
Checkout BagStep/Address/Delivery/Payment 全部沿用同一份 cart ✅
PaymentStep 的 Subtotal 永远来自 cart（不会再被旧 itemsMinor 污染）✅
quote 与订单落库都用同一套 “cart -> itemsMinorEffective” 计算 ✅
以后你再改价格字段，也不容易回归 ✅

# ============================================================================

# ============================================================================

正式上线

# ============================================================================

# ============================================================================

# ============================================================================

裤子 袜子 暂时不开放，鞋子拆开category，同时他们对应的数据类型，variant title之类的东西要确认

部署到 Vercel（免费 https），再在该预览域名上测试 PaymentElement。

或者用 ngrok 给本地 3000 端口开 https 隧道：

用户付款后如何获得用户的邮箱，并发 confirmation email: 1.访客结账时显式收集
在收货地址 / 联系方式表单里有 “Email（必填）” 一栏；提交订单就带上了。

客服

不同产品，有些产品我只是作为零售商，但是有些产品，我是作为全供应链者去售卖的

profile 页面修改 email，可能需要进一步改进

感觉还是在前端中得保留多币种，但结账的时候统一使用aud

主页海报

==============================================================================

==============================================================================

专业电商风格

social media 微信小红书链接 icon

发邮件里的邮件 html，添加自动发邮件的位置，结账的时候自动发 order confirmation email

弹出错误提示的时候，统一一下，红色错误提示的 style，还有就是成功提示也要统一一下，把错误提示 UI 改成和你第二张截图一样的 红色提示块（border + bg + padding）

checkout 之后需要自动发邮件，内容包含 order confirmation 以及 package tracking

similar product , produtc you may also interest

用户评论

网页下面的邮箱，privacy 条款需要再上线的时候替换成真实的privacy，邮箱

delivery option

手机端

群发邮件记得，要筛选，同意email的用户

远端数据库只储存 1 年，可以储存在本地，定期删掉过期数据，但保留在本地

delivery fee的计算，以及运输费用不同地区免费的标准也不一样，delivery 需要多少天才能抵达

==============================================================================
千万不要修改我原本的代码里的任何逻辑和语法，和原本的代码内容，千万不要做修改

# ============================================================================

============================================

很好，然后我想修改 Delivery & Collection 这部分的内容，我希望取消掉 collection，只让用户选择 Standard delivery 或者 Express delivery

然后在 Standard delivery 和 Express delivery 底下分别说明：

Standard delivery 是免费的如果消费额度大于或者等于 100

Express delivery 则有更快的速度抵达

1. domain
2. fornt end
3. payment
4. cloud server
5. supllier
6. delivery
7. text size
8. mobine end
9. html email css
   10，user 注册 协议

生产环境里最好在服务器端根据商品 ID 重新计算总价

==========================
terms and conditions
==========================

我有一个前端购物react网站项目，cloudflare的D1数据库项目，以及一个strapi项目（负责用cms管理购物网站上售卖的产品），我想优化一下我的这个项目，你先大致看看我的项目内容吧 social-platform 是我的前端购物react网站项目，你看看我的项目 d1-worker是我的cloudflare的D1数据库项目，你看看我的项目

你在解压我的 social-platform.zip 文件的时候可以直接跳转 node_modules/.next 因为我的这个zip比较大

================================================

privacy，注册条款，网站footer条款

ios

客户真的下单之后，要怎么通知供货商

邮件+物流track

3大区域做成strapi的内容

delivery tracking email

order confirmation 对应的图片

================================================

注册账号成功页要发email

delivery发送到不同的地区所需要的时间也不一样，要把不同的时间写到数据库中

return功能需要再做检查，一个item一个item的检查

怎么stock不减少了

退货的时候可以让顾客提交图片

stock为0的时候不能交易
