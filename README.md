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

# ============================================================================

# ============================================================================

2.1

（可选）已登录用户修改密码：POST /auth/change-password

这个接口通过现有会话（/auth/me 的同样校验），要求提供 old_password + new_password，校验旧密后更新为新密。你以后要做“安全设置”页就能直接用。

密码 eye icon

New In, Women, Men, Beauty, Home, Travel & Tech, Kids, Toys, Gifts, Sale, Myer one

Category: Shoes, Bottoms, Tops, Suit, Accessories, Outfit

Sub-Category: Causal, Formal, long sleeve, short sleeve

Filter: New Arrival, Sale

价格全球化

不同国际标准的 size

deploy 的时候保留本地测试的 localhost

<!-- 但好像不需要 -->

要不要把 gender 显示在 product 前端

如果 stock 为 0 则显示 sold out，不同颜色的 sold out

sort 按钮：

    1. 价格从高到低
    2. 价格从低到高
    3. 热度 也就是我们hot score
    best seller
    newest

delivery 需要多少天才能抵达

“add to bag” 按钮
“Bag” ，“Address” ，“Delivery” ，以及 “Payment” 的内容区

checkout 页面里的 payment 页面里的 private policy

用户邮箱和是否接受 email，等信息，该如何储存？

checkout 页面里的每个页面都是依次点击的

# ============================================================================

# ============================================================================

正式上线

# ============================================================================

# ============================================================================

1.需要修改 dilivery fee

# ============================================================================

部署到 Vercel（免费 https），再在该预览域名上测试 PaymentElement。

或者用 ngrok 给本地 3000 端口开 https 隧道：

用户付款后如何获得用户的邮箱，并发 confirmation email: 1.访客结账时显式收集
在收货地址 / 联系方式表单里有 “Email（必填）” 一栏；提交订单就带上了。

2.来自支付方式/钱包
Apple Pay / Google Pay / PayPal / Stripe Link 等会把买家的“账单邮箱”回传给商家（取决于集成方式），商家用它发收据。

目前是根据我在 strapi 中定位的是 USD，就是用 USD 交易，用 AUD 就是用 AUD 交易，要不要动态改变我的 currency 呢，或者说让币种随“地址国家/地区”变化，通常做法是：等用户在 Address 步骤选择了国家，再把币种映射出来传给支付：生产中建议用 Stripe 的 Products/Prices 按币种定价，或接入稳定的汇率源；不要在请求里“临时乘一个写死的汇率”。

AUD，CAD，EUR，GBP，USD

方案 1 ｜保留多币种余额（不自动换汇）

在 PayPal 商业账户里 添加 USD/EUR 货币余额，就会分别以 USD/EUR/AUD 入账并单独结余（没有即时汇损）。

路径（大意）：PayPal 商业账户 → 右上角齿轮 Settings → Money, banks and cards / Money → Currencies / Manage currencies → Add a currency（加 USD、EUR）。

之后你可以在需要的时候手动把 USD/EUR 换成 AUD，或提现到对应币种的银行账户（如有）。

我想问下这样做的话，当买家付钱给我（当然买家可能会来自不同的地区用不同的 currency 结算），是不是会自动通过 paypal 转换汇率成 AUD 打到我的 paypal 账户中

# ============================================================================

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
