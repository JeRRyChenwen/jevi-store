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

/** 可选：当你拿到的是媒体对象（可能在 attributes 里）时，统一解析出完整 URL */
export function resolveMediaURL(media: any): string {
  const u = media?.url ?? media?.attributes?.url ?? "";
  return mediaUrl(u);
}

/* -------------------------------------------------------------------------- */
/*                               分类下拉：新增通用方法                        */
/* -------------------------------------------------------------------------- */

export type CategoryLite = {
  name: string;
  slug: string;
  documentId: string;
  nav_order?: number;
};

// 顶级分类 slug -> documentId 的内存缓存
let __topLevelDocIdMapCache: Record<string, string> | null = null;

/**
 * 获取所有“顶级分类”（parent 为空），并构建 slug -> documentId 的映射。
 * 说明：
 * - 一次请求后缓存在内存，后续悬停任意顶级分类时可直接用。
 * - 返回的字段同时兼容 Strapi 的 attributes 结构与“扁平”结构。
 */
export async function fetchTopLevelCategoryDocIdMap(): Promise<Record<string, string>> {
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
    // 同时兼容 attributes 与扁平返回
    const slug = c.slug ?? c.attributes?.slug;
    const docId = c.documentId ?? c.attributes?.documentId ?? c.id;
    if (slug && docId) map[String(slug)] = String(docId);
  }

  __topLevelDocIdMapCache = map;
  return map;
}

/**
 * 根据父分类的 documentId，获取其子分类列表。
 * - 仅返回轻量字段（name/slug/documentId/nav_order），已按 nav_order、name 排序。
 * - 结果用于 CategoryBar 的下拉菜单。
 */
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

/** 如需手动失效顶级分类缓存，可调用此方法（可选） */
export function __invalidateTopLevelCategoryCache() {
  __topLevelDocIdMapCache = null;
}

/* -------------------------------------------------------------------------- */
/*                       （可选）商品列表的通用查询示例                         */
/* -------------------------------------------------------------------------- */

/**
 * （可选）按分类 slug 查询商品列表，供分类页使用。
 * 后续你做价格/颜色/尺码筛选时，可在此追加 filters。
 */
export async function queryProductsByCategorySlug(
  slug: string,
  page = 1,
  pageSize = 40
) {
  const qs =
    `/api/products` +
    `?populate=cover,variants,category` +
    `&filters[category][slug][$eq]=${encodeURIComponent(slug)}` +
    `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
    `&sort=updatedAt:desc` +
    `&publicationState=live`;

  return api(qs, { noCache: false });
}
