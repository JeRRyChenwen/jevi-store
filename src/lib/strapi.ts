// src/lib/strapi.ts
// 统一处理 Strapi 请求 & 媒体地址（带更清晰的错误输出 + 可选 Token）

const DEFAULT_URL = "http://localhost:1337";

const PUBLIC_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? DEFAULT_URL;
const SERVER_URL = process.env.STRAPI_URL ?? PUBLIC_URL;

const isServer = typeof window === "undefined";
export function getStrapiURL() {
  return isServer ? SERVER_URL : PUBLIC_URL;
}

/** 可选：通过环境变量启用鉴权
 *  前端：NEXT_PUBLIC_STRAPI_TOKEN
 *  服务端/构建：STRAPI_API_TOKEN（优先）
 */
const PUBLIC_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN;
const SERVER_TOKEN = process.env.STRAPI_API_TOKEN ?? PUBLIC_TOKEN;

function authHeader() {
  const token = isServer ? SERVER_TOKEN : PUBLIC_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type FetchOpts = RequestInit & {
  next?: RequestInit["next"];
  /** 在客户端禁用缓存（加时间戳 + cache: 'no-store'；服务端等效 revalidate: 0） */
  noCache?: boolean;
};

/** 统一请求函数：自动拼 baseURL、可选 noCache/revalidate、详细报错 */
export async function api(path: string, opts: FetchOpts = {}) {
  const { noCache, ...rest } = opts;

  // 允许传绝对 URL 或以 / 开头的路径
  const base = getStrapiURL().replace(/\/+$/, "");
  let url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  // 如果调用方传了 next: { revalidate: 0 }，在客户端等效为 noCache
  const effectiveNoCache =
    !!noCache || (!isServer && opts.next && (opts.next as any).revalidate === 0);

  // 客户端 noCache：附加时间戳避免浏览器 HTTP 缓存
  if (effectiveNoCache) {
    url += `${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;
  }

  // 统一 headers
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...authHeader(),
    ...(rest.headers || {}),
  };

  // 统一 fetch 选项
  const fetchOpts: RequestInit & { next?: RequestInit["next"] } = {
    ...rest,
    headers,
  };

  // 客户端：用 cache: 'no-store'；服务端：用 next.revalidate
  if (!isServer) {
    if (effectiveNoCache) fetchOpts.cache = "no-store";
  } else {
    // 服务端默认 60s，可被调用方覆盖；noCache 强制 0
    const defaultRevalidate = effectiveNoCache ? 0 : 60;
    fetchOpts.next = rest.next ?? { revalidate: defaultRevalidate };
    if (effectiveNoCache) fetchOpts.cache = "no-store";
  }

  const res = await fetch(url, fetchOpts);

  if (!res.ok) {
    let raw: any;
    let text = "";
    try {
      raw = await res.json();
      text = JSON.stringify(raw);
    } catch {
      text = await res.text().catch(() => "");
    }
    // eslint-disable-next-line no-console
    console.error("Strapi API error:", res.status, url, text);

    const msg =
      (raw && (raw.error?.message || raw.message)) ||
      text ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// 拼接媒体文件 URL（后端通常返回相对路径）
export function mediaUrl(url?: string | null) {
  if (!url) return "";
  return url.startsWith("http")
    ? url
    : `${getStrapiURL()}${url.startsWith("/") ? "" : "/"}${url}`;
}
