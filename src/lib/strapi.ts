// src/lib/strapi.ts
// 统一处理 Strapi 请求 & 媒体地址（支持服务端直连 + 客户端走代理）
// 关闭 Public 读权限后，前端所有请求都会经由 /api/strapi 代理，由服务端注入 Bearer Token。

const DEFAULT_URL = "http://localhost:1337";

const PUBLIC_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? DEFAULT_URL; // 仅用于拼媒体绝对地址
const SERVER_URL = process.env.STRAPI_URL ?? PUBLIC_URL; // 服务器直连 Strapi

const isServer = typeof window === "undefined";
export function getStrapiURL() {
  return isServer ? SERVER_URL : PUBLIC_URL;
}

type FetchOpts = RequestInit & {
  next?: RequestInit["next"];
  /** 在客户端禁用缓存（加时间戳 + cache: 'no-store'；服务端等效 revalidate: 0） */
  noCache?: boolean;
};

// ------------------- 与“多币种价格组件”相关的小工具 -------------------
/** 在需要的产品查询上拼上 prices 组件的 populate。安全幂等（不会重复拼）。 */
export const PRODUCT_PRICE_POPULATE = `&populate[prices]=*`;

export function withPricePopulate(qs: string): string {
  return qs.includes("populate[prices]") ? qs : `${qs}${PRODUCT_PRICE_POPULATE}`;
}

// -------- 核心请求 --------
export async function api(path: string, opts: FetchOpts = {}) {
  const { noCache, ...rest } = opts;

  // 允许传绝对 URL 或以 / 开头的路径
  const base = (isServer ? SERVER_URL : PUBLIC_URL).replace(/\/+$/, "");
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  // 服务器：直连 Strapi，并在这里附上 Authorization 头（使用 STRAPI_API_TOKEN）
  if (isServer) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    } as Record<string, string>;

    const token = process.env.STRAPI_API_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const fetchOpts: RequestInit & { next?: RequestInit["next"] } = {
      ...rest,
      headers,
    };

    // SSR 缓存/再验证
    const defaultRevalidate = noCache ? 0 : 60;
    fetchOpts.next = rest.next ?? { revalidate: defaultRevalidate };
    if (noCache) fetchOpts.cache = "no-store";

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      let body: any;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => "");
      }
      console.error("Strapi API error (server):", res.status, url, body);
      const msg =
        body?.error?.message ||
        body?.message ||
        body ||
        res.statusText ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  }

  // 浏览器：走 Next 代理。把 path 与原始 fetch 选项打包到 /api/strapi，由服务器注入 Token
  const payload = {
    path,
    opts: {
      ...rest,
      noCache: !!noCache,
    },
  };

  const proxyRes = await fetch("/api/strapi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: noCache ? "no-store" : "default",
  });

  if (!proxyRes.ok) {
    let body: any;
    try {
      body = await proxyRes.json();
    } catch {
      body = await proxyRes.text().catch(() => "");
    }
    console.error(
      "Strapi API error (client via proxy):",
      proxyRes.status,
      path,
      body
    );
    const msg =
      body?.error?.message ||
      body?.message ||
      body ||
      proxyRes.statusText ||
      `HTTP ${proxyRes.status}`;
    throw new Error(msg);
  }
  return proxyRes.json();
}

// 拼接媒体文件 URL（后端通常返回相对路径）
export function mediaUrl(url?: string | null) {
  if (!url) return "";
  return url.startsWith("http")
    ? url
    : `${getStrapiURL()}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function resolveMediaURL(media: any): string {
  const u = media?.url ?? media?.attributes?.url ?? "";
  return mediaUrl(u);
}

/* -------------------------------------------------------------------------- */
/*                         以下你的原有工具函数保持不变                         */
/* -------------------------------------------------------------------------- */

export type CategoryLite = {
  name: string;
  slug: string;
  documentId: string;
  nav_order?: number;
  /** ✅ 新增：用于导航栏开关（Strapi boolean 字段） */
  show_in_nav?: boolean;
};

let __topLevelDocIdMapCache: Record<string, string> | null = null;
/** ✅ 新增：顶级导航分类缓存 */
let __navTopCategoriesCache: CategoryLite[] | null = null;

/**
 * ✅ 新增：获取“用于导航栏”的顶级分类列表
 * - parent=null（顶级）
 * - show_in_nav=true（Strapi 控制是否显示在导航）
 * - 按 nav_order/name 排序
 */
export async function fetchNavTopCategories(): Promise<CategoryLite[]> {
  if (__navTopCategoriesCache) return __navTopCategoriesCache;

  const res: any = await api(
    `/api/categories` +
      `?filters[parent][$null]=true` +
      `&filters[show_in_nav][$eq]=true` +
      `&fields[0]=name&fields[1]=slug&fields[2]=documentId&fields[3]=nav_order&fields[4]=show_in_nav` +
      `&sort[0]=nav_order:asc&sort[1]=name:asc` +
      `&pagination[pageSize]=200` +
      `&publicationState=live`,
    { noCache: true }
  );

  const list: any[] = res?.data ?? [];
  const out: CategoryLite[] = list.map((c) => ({
    name: c.name ?? c.attributes?.name ?? "",
    slug: c.slug ?? c.attributes?.slug ?? "",
    documentId: c.documentId ?? c.attributes?.documentId ?? "",
    nav_order: c.nav_order ?? c.attributes?.nav_order,
    show_in_nav: c.show_in_nav ?? c.attributes?.show_in_nav,
  }));

  __navTopCategoriesCache = out;
  return out;
}

export async function fetchTopLevelCategoryDocIdMap(): Promise<
  Record<string, string>
> {
  if (__topLevelDocIdMapCache) return __topLevelDocIdMapCache;

  const res: any = await api(
    `/api/categories` +
      `?filters[parent][$null]=true` +
      `&fields[0]=name&fields[1]=slug&fields[2]=documentId&fields[3]=nav_order` +
      `&sort[0]=nav_order:asc&sort[1]=name:asc` +
      `&pagination[pageSize]=200` +
      `&publicationState=live`,
    { noCache: true }
  );

  const list: any[] = res?.data ?? [];
  const map: Record<string, string> = {};

  for (const c of list) {
    const slug = c.slug ?? c.attributes?.slug;
    const docId = c.documentId ?? c.attributes?.documentId ?? c.id;
    if (slug && docId) map[String(slug)] = String(docId);
  }

  __topLevelDocIdMapCache = map;
  return map;
}

export async function fetchSubcategoriesByParentId(
  parentDocumentId: string
): Promise<CategoryLite[]> {
  if (!parentDocumentId) return [];

  const res: any = await api(
    `/api/categories` +
      `?filters[parent][documentId][$eq]=${encodeURIComponent(parentDocumentId)}` +
      `&fields[0]=name&fields[1]=slug&fields[2]=documentId&fields[3]=nav_order` +
      `&sort[0]=nav_order:asc&sort[1]=name:asc` +
      `&publicationState=live`,
    { noCache: true }
  );

  const list: any[] = res?.data ?? [];
  return list.map((c) => ({
    name: c.name ?? c.attributes?.name ?? "",
    slug: c.slug ?? c.attributes?.slug ?? "",
    documentId: c.documentId ?? c.attributes?.documentId ?? "",
    nav_order: c.nav_order ?? c.attributes?.nav_order,
  }));
}

export function __invalidateTopLevelCategoryCache() {
  __topLevelDocIdMapCache = null;
  __navTopCategoriesCache = null;
}

/**
 * 旧的分类查询工具，默认带上 prices 组件，避免忘记 populate。
 * 如需进一步的图片/变体字段，可在调用处追加其它 populate 段。
 */
export async function queryProductsByCategorySlug(
  slug: string,
  page = 1,
  pageSize = 40
) {
  let qs =
    `/api/products` +
    `?filters[category][slug][$eq]=${encodeURIComponent(slug)}` +
    `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
    `&sort=updatedAt:desc` +
    `&publicationState=live`;

  // ✅ 默认补上 prices
  qs = withPricePopulate(qs);

  return api(qs, { noCache: false });
}

/* -------------------------------------------------------------------------- */
/*                             ✅ 首页热度查询工具                              */
/* -------------------------------------------------------------------------- */

/**
 * ✅ 首页：按 hot_score 取某分类最热的 N 个商品
 *
 * 关键点：
 * - 绝对不要用 fields[0]=name（你的 Product 没有 name 字段，PDP 用的是 title）
 * - 你的 Strapi 对 products 的 query 校验很严格，fields 会触发 400，所以这里不裁剪字段
 * - 只保留 prices populate（你前端价格依赖它）
 */
export async function queryHotProductsByCategorySlug(slug: string, limit = 6) {
  let qs =
    `/api/products` +
    `?filters[category][slug][$eq]=${encodeURIComponent(slug)}` +
    `&pagination[page]=1&pagination[pageSize]=${limit}` +
    `&sort[0]=hot_score:desc&sort[1]=priority:asc&sort[2]=updatedAt:desc` +
    `&publicationState=live`;

  qs = withPricePopulate(qs);
  return api(qs, { noCache: true });
}

/**
 * ✅ Debug：快速确认你库里到底有没有 “live products”
 * - 用在排查 “No products yet” 时非常有用
 */
export async function debugProductTotal(): Promise<number> {
  try {
    const json: any = await api(
      `/api/products?pagination[page]=1&pagination[pageSize]=1&publicationState=live`,
      { noCache: true }
    );
    return Number(json?.meta?.pagination?.total ?? 0);
  } catch {
    return 0;
  }
}
