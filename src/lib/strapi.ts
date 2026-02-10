// src/lib/strapi.ts
// 统一处理 Strapi 请求 & 媒体地址（支持服务端直连 + 客户端走代理）
// 关闭 Public 读权限后，前端所有请求都会经由 /api/strapi 代理，由服务端注入 Bearer Token。

const DEFAULT_URL = "http://localhost:1337";

const PUBLIC_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? DEFAULT_URL; // 仅用于拼媒体绝对地址（客户端可用）
const SERVER_URL = process.env.STRAPI_URL ?? PUBLIC_URL; // 服务器直连 Strapi（服务端用）

const isServer = typeof window === "undefined";

export function getStrapiURL() {
  return isServer ? SERVER_URL : PUBLIC_URL;
}

type FetchOpts = RequestInit & {
  next?: RequestInit["next"];
  /** 在客户端禁用缓存（加时间戳 + cache: 'no-store'；服务端等效 revalidate: 0） */
  noCache?: boolean;
  /**
   * ✅ NEW: 是否要求必须带 Token（默认 true）
   * - 你现在走“关闭 Public + Token”的架构，默认强制更安全
   * - 如果未来你有某些 Public endpoint（不建议），可传 requireAuth: false
   */
  requireAuth?: boolean;
};

// ------------------- 与“多币种价格组件”相关的小工具 -------------------
/** 在需要的产品查询上拼上 prices 组件的 populate。安全幂等（不会重复拼）。 */
export const PRODUCT_PRICE_POPULATE = `&populate[prices]=*`;

export function withPricePopulate(qs: string): string {
  return qs.includes("populate[prices]") ? qs : `${qs}${PRODUCT_PRICE_POPULATE}`;
}

// -------- 核心请求 --------
export async function api(path: string, opts: FetchOpts = {}) {
  const { noCache, requireAuth = true, ...rest } = opts;

  // ✅ 安全：客户端只允许传相对 path，避免把 /api/strapi 变成任意代理（SSRF 风险）
  if (!isServer) {
    if (path.startsWith("http")) {
      throw new Error(
        `[strapi.api] Client-side call must use relative path, got absolute URL: ${path}`
      );
    }
  }

  // 允许传绝对 URL（仅服务端允许）或以 / 开头的路径
  const base = (isServer ? SERVER_URL : PUBLIC_URL).replace(/\/+$/, "");
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  // ------------------- 服务器：直连 Strapi 并注入 Bearer Token -------------------
  if (isServer) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    } as Record<string, string>;

    const token = process.env.STRAPI_API_TOKEN;

    // ✅ NEW: 默认强制要求 token（避免“配置没生效但你不知道”）
    if (requireAuth) {
      if (!token) {
        throw new Error(
          "[strapi.api] STRAPI_API_TOKEN is missing on server. " +
            "You are using Token-protected Strapi endpoints; please set STRAPI_API_TOKEN in .env.local."
        );
      }
      headers.Authorization = `Bearer ${token}`;
    } else {
      // 若不强制，则存在 token 就加（可选）
      if (token) headers.Authorization = `Bearer ${token}`;
    }

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

  // ------------------- 浏览器：走 Next 代理 /api/strapi（由服务端注入 Token） -------------------
  const payload = {
    path,
    opts: {
      ...rest,
      noCache: !!noCache,
      // ✅ 把 requireAuth 也传过去，让 proxy 可以按需处理
      requireAuth: !!requireAuth,
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

/**
 * ✅ 统一解析媒体 URL（兼容 Strapi v5/v4；兼容单图/多图；兼容 formats）
 * - media 可能是：对象 / 数组 / v4 的 { data: ... } 结构
 */
export function resolveMediaURL(
  media: any,
  prefer: "large" | "medium" | "small" | "thumbnail" | "original" = "large"
): string {
  if (!media) return "";

  // v5 multiple media => array（取第一张）
  const m = Array.isArray(media) ? media[0] : media;

  // 兼容 v4 data/attributes 结构
  const m2 = m?.data
    ? Array.isArray(m.data)
      ? m.data[0]?.attributes ?? m.data[0]
      : m.data?.attributes ?? m.data
    : m;

  const formats = m2?.formats ?? m2?.attributes?.formats;

  const u =
    (prefer !== "original" ? formats?.[prefer]?.url : "") ||
    formats?.large?.url ||
    formats?.medium?.url ||
    formats?.small?.url ||
    formats?.thumbnail?.url ||
    m2?.url ||
    m2?.attributes?.url ||
    "";

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

  qs = withPricePopulate(qs);

  return api(qs, { noCache: false });
}

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

/* -------------------------------------------------------------------------- */
/*                          ✅ Home Hero Banners (Strapi v5)                   */
/* -------------------------------------------------------------------------- */

export type HomeBannerLite = {
  documentId: string;
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string | null;
  order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  image_desktop_url?: string;
  image_mobile_url?: string; // 你当前没有这个字段，但保留类型，前端可 fallback
};

function isWithinSchedule(
  now: Date,
  starts?: string | null,
  ends?: string | null
) {
  const s = starts ? new Date(starts) : null;
  const e = ends ? new Date(ends) : null;

  const sOk = s && !Number.isNaN(+s) ? s : null;
  const eOk = e && !Number.isNaN(+e) ? e : null;

  if (sOk && now < sOk) return false;
  if (eOk && now > eOk) return false;
  return true;
}

// ✅ 固定只取这一条（你想要的“写死”）
const HOME_TOP_BANNER_NAME = "Home-Top-Banner";

/**
 * ✅ v5：Home Banner 里存 slides（Repeatable Component）
 * 你的实际返回（curl）是：
 * data[0].slides = [{..., image_desktop: { url, formats... }}, ...]
 *
 * ✅ 注意：
 * - slides 里没有 image_mobile，所以不要 populate 它（会 400）
 * - 前端 mobile 图：fallback 到 desktop
 */
export async function fetchHomeBanners(limit = 20): Promise<HomeBannerLite[]> {
  // ✅ 只查 name=Home-Top-Banner + 只取 1 条
  const qs =
    `?publicationState=live` +
    `&filters[name][$eq]=${encodeURIComponent(HOME_TOP_BANNER_NAME)}` +
    `&pagination[page]=1&pagination[pageSize]=1` +
    `&populate[slides][populate][0]=image_desktop`;

  const res: any = await api(`/api/home-banners${qs}`, { noCache: true });

  const rows: any[] = Array.isArray(res?.data) ? res.data : [];
  const top = rows[0];
  if (!top) return [];

  // v5/v4 兼容
  const a = top?.attributes ?? top ?? {};
  const slides: any[] = Array.isArray(a?.slides) ? a.slides : [];

  const now = new Date();

  const out: HomeBannerLite[] = slides
    .map((s: any) => {
      const desktopUrl = resolveMediaURL(s?.image_desktop, "large");

      // ✅ 你当前没有 image_mobile 字段：直接 fallback
      const mobileUrl = desktopUrl;

      return {
        // ✅ client 侧 key 只要稳定即可（用组件项 id 最稳）
        documentId: String(s?.id ?? s?.documentId ?? ""),
        title: String(s?.title ?? ""),
        subtitle: String(s?.subtitle ?? ""),
        cta_label: s?.cta_label ?? null,
        cta_href: s?.cta_href ?? null,
        order: Number.isFinite(Number(s?.order)) ? Number(s.order) : undefined,
        starts_at: s?.starts_at ?? null,
        ends_at: s?.ends_at ?? null,
        image_desktop_url: desktopUrl,
        image_mobile_url: mobileUrl,
      };
    })
    .filter((b) => {
      // ✅ 只展示：active + 在排期内 + 有图
      const src = slides.find((x) => String(x?.id ?? x?.documentId ?? "") === b.documentId);
      const isActive = src?.is_active ?? true;
      if (!isActive) return false;

      if (!b.image_desktop_url) return false;
      return isWithinSchedule(now, b.starts_at, b.ends_at);
    })
    .sort((x, y) => {
      const a = Number.isFinite(Number(x.order)) ? Number(x.order) : 1e9;
      const b = Number.isFinite(Number(y.order)) ? Number(y.order) : 1e9;
      return a - b;
    })
    .slice(0, limit);

  return out;
}


export async function fetchHomeBannerSlidesByName(
  name: string,
  limit = 20
): Promise<HomeBannerLite[]> {
  const qs =
    `?publicationState=live` +
    `&filters[name][$eq]=${encodeURIComponent(name)}` +
    `&pagination[page]=1&pagination[pageSize]=1` +
    `&populate[slides][populate][0]=image_desktop`;

  const res: any = await api(`/api/home-banners${qs}`, { noCache: true });

  const row = Array.isArray(res?.data) ? res.data[0] : null;
  if (!row) return [];

  const slidesRaw: any[] = Array.isArray(row?.slides) ? row.slides : [];
  const now = new Date();

  const out: HomeBannerLite[] = slidesRaw
    .map((s: any, idx: number) => {
      const desktopUrl = resolveMediaURL(s?.image_desktop, "large");

      return {
        // 注意：slides component 自己只有 id（不是 documentId），用 id 做稳定 key 就够了
        documentId: String(s?.id ?? `${name}-slide-${idx}`),
        title: s?.title ?? "",
        subtitle: s?.subtitle ?? "",
        cta_label: s?.cta_label ?? "",
        cta_href: s?.cta_href ?? null,
        order: Number.isFinite(Number(s?.order)) ? Number(s?.order) : idx,
        starts_at: s?.starts_at ?? null,
        ends_at: s?.ends_at ?? null,
        image_desktop_url: desktopUrl,
        // 你 HomeBannerClient 里会用到 image_mobile_url，但 mid banner 只用背景也无所谓
        image_mobile_url: desktopUrl,
      };
    })
    .filter((x) => {
      // active + 时间窗 + 有图
      const src = slidesRaw.find((t) => String(t?.id) === x.documentId);
      const isActive = typeof src?.is_active === "boolean" ? src.is_active : true;
      if (!isActive) return false;
      if (!x.image_desktop_url) return false;
      return isWithinSchedule(now, x.starts_at, x.ends_at);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, limit);

  return out;
}