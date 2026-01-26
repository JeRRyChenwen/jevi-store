// src/app/category/[slug]/CategoryGridClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination/Pagination";
import { api, mediaUrl } from "@/lib/strapi";
import FilterDrawer from "./_components/FilterDrawer";
import ProductGrid from "./_components/ProductGrid";
import CategoryHeader from "./_components/CategoryHeader";



// 颜色工具
import { normalizeColorName } from "@/lib/colors";

// ✅ 兼容导入：若你的 lib 提供了相同函数则直接用；否则使用兜底
import * as SP from "@/lib/strapiPrice";

// 不依赖对方导出的类型，避免类型导出不一致时报错
type PriceRec = any;

/** 兜底：将最小货币单位格式化为字符串，如 50000 -> "AUD 500.00" */
function _fallbackFmtMoneyMinor(minor: number, ccy: string) {
  const code = String(ccy || "AUD").toUpperCase();
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format((minor || 0) / 100);
}

/** 兜底：按币种挑选并计算价格
 * - price 视为“主要货币单位”（500 => 500.00），转成 base_minor=price*100
 * - 若存在 amount_minor 则优先使用
 * - 支持 discount=85(=85%) 或 discount_percent_off=24(=24% OFF)
 * - 仅在时间窗内才应用折扣
 */
function _fallbackPickPriceForCurrency(prices: PriceRec[], currency: string) {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const code = String(currency || "AUD").toUpperCase();

  const rec: any =
    prices.find((r: any) => String(r?.currency || "").toUpperCase() === code) ||
    prices[0] ||
    null;
  if (!rec) return null;

  let base_minor: number | null = null;
  if (typeof rec.amount_minor === "number" && Number.isFinite(rec.amount_minor)) {
    base_minor = Math.max(0, Math.round(rec.amount_minor));
  } else if (typeof rec.price === "number" && Number.isFinite(rec.price)) {
    base_minor = Math.max(0, Math.round(rec.price * 100));
  }
  if (base_minor == null) return { base_minor: null, effective_minor: null, currency: code };

  const now = Date.now();

  let effective_minor = base_minor;

  const inWindow = (s?: string, e?: string) => {
    const okS = !s || now >= Date.parse(s);
    const okE = !e || now <= Date.parse(e);
    return okS && okE;
  };

  // —— 折扣（两种口径都支持），仅在有效期内生效 ——
  if (inWindow(rec.sale_starts_at, rec.sale_ends_at)) {
    const d = Number(rec.discount);
    const off = Number(rec.discount_percent_off);

    if (Number.isFinite(d) && d > 0 && d <= 100) {
      // discount = 85  →  85%
      effective_minor = Math.max(0, Math.round(base_minor * (d / 100)));
    } else if (Number.isFinite(off) && off > 0 && off < 100) {
      // discount_percent_off = 24 → 24% OFF
      effective_minor = Math.max(0, Math.round(base_minor * (1 - off / 100)));
    }
  }

  return { base_minor, effective_minor, currency: code };
}

// 实际使用：优先采用你库里的实现
const fmtMoneyMinor: (minor: number, currency: string) => string =
  (SP as any).fmtMoneyMinor || _fallbackFmtMoneyMinor;

// ★ 卡片专用价格格式：AUD -> "AUD $425.00"
function formatPriceForCard(minor: number, currency: string) {
  const code = String(currency || "AUD").toUpperCase();
  const major = (minor || 0) / 100;

  // 只格式化数字部分
  const numStr = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major); // 425.0 -> "425.00"

  // AUD 特殊：想要 "AUD $425.00"
  if (code === "AUD") {
    return `AUD $${numStr}`;
  }

  // 其他币种：比如 "USD 425.00"
  return `${code} ${numStr}`;
}


type PickRes =
  | { base_minor: number | null; effective_minor: number | null; currency: string }
  | null;

/**
 * 适配器：
 * - 若存在 SP.pickPriceForCurrency（返回 baseMajor/effectiveMajor），先用它
 * - 把 major 转成 minor
 * - 若库函数没产生折扣（effective==base），再用兜底规则重算一次折扣
 * - 否则直接退回兜底
 */
const pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes = (prices, currency) => {
  const ccy = String(currency || "AUD").toUpperCase();
  const libPick = (SP as any)?.pickPriceForCurrency;

  if (typeof libPick === "function") {
    try {
      // 期望库函数返回 { currency, baseMajor, effectiveMajor, badge? }
      const r = libPick(prices, ccy);
      if (r) {
        const baseMinor =
          Number.isFinite(Number(r.baseMajor)) ? Math.round(Number(r.baseMajor) * 100) : null;
        let effMinor =
          Number.isFinite(Number(r.effectiveMajor)) ? Math.round(Number(r.effectiveMajor) * 100) : baseMinor;
        const outCcy = String(r.currency || ccy).toUpperCase();

        // 如果库函数没有算出折扣（eff==base），用兜底规则再试一遍
        if (baseMinor != null && effMinor === baseMinor) {
          const fb = _fallbackPickPriceForCurrency(prices, outCcy);
          if (
            fb &&
            typeof fb.base_minor === "number" &&
            typeof fb.effective_minor === "number" &&
            fb.effective_minor < fb.base_minor
          ) {
            return fb; // 用兜底折扣结果
          }
        }
        return { base_minor: baseMinor, effective_minor: effMinor, currency: outCcy };
      }
    } catch {
      // 忽略并走兜底
    }
  }

  // 没有库函数或调用失败 → 兜底
  return _fallbackPickPriceForCurrency(prices, ccy);
};

type Props = {
  slug: string;
  title: string;
  /** 初始总数（未筛选）。应用筛选后会用接口返回的 filteredTotal 覆盖 */
  total: number;
  pageSize?: number;
  /** 顶级分类 = 自身 + 子分类 documentId，用于 $in 过滤 */
  categoryDocIds?: string[];
  /** ★ 新增：展示币种（与 pickPriceForCurrency 对齐），默认 AUD */
  displayCurrency?: string;
};

type ProductLite = {
  key: string;
  slug?: string; // 用于详情页路由
  name: string;

  /** ✅ 来自 Strapi Price 组件（按你的组件字段解析） */
  prices: PriceRec[];

  /** 旧字段（保底用，base_price_cents / currency） */
  price: number | null;
  currency?: string | null;

  /** 折扣与时间窗（旧字段，暂保留） */
  discountPercent?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  hotScore?: number | null;

  /** 可选颜色（来自 variants.color 与/或 color_galleries.color） */
  colors?: string[];
  /** ✅ 可选尺码（来自 variants.size） */
  sizes?: string[];

  /** 颜色 -> 该颜色的图片数组（来自 product.color_galleries） */
  variantsByColor: Record<string, string[]>;

  /** 兜底首图（从 variantsByColor 中取第一张） */
  imageUrl?: string;
};

// ============ 排序键 & 标签 ============
export type SortKey = "default" | "price-desc" | "price-asc" | "hot";

const DEV = process.env.NODE_ENV !== "production";
const dbg = (...args: unknown[]) => DEV && console.debug("[Grid]", ...args);

// ---------- helpers ----------
const toCents = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) : undefined;

function parseCSV(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key)?.trim() || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 解析 product.color_galleries：颜色 -> 图片数组 */
function getImagesByColorFromProduct(attrs: any): Record<string, string[]> {
  const arr: any[] = Array.isArray(attrs?.color_galleries)
    ? attrs.color_galleries
    : Array.isArray(attrs?.color_galleries?.data)
    ? attrs.color_galleries.data
    : [];
  const out: Record<string, string[]> = {};
  for (const cg of arr) {
    const colorRaw = (cg?.color ?? cg?.attributes?.color) as string | undefined;
    const color = normalizeColorName(colorRaw);
    if (!color) continue;

    const imgs: any[] = Array.isArray(cg?.images?.data)
      ? cg.images.data
      : Array.isArray(cg?.images)
      ? cg.images
      : [];
    const urls: string[] = [];
    for (const im of imgs) {
      const m = im?.attributes ?? im ?? {};
      const u =
        m?.formats?.large?.url ??
        m?.formats?.medium?.url ??
        m?.formats?.small?.url ??
        m?.formats?.thumbnail?.url ??
        m?.url;
      if (typeof u === "string") urls.push(mediaUrl(u));
    }
    if (urls.length) out[color] = urls;
  }
  return out;
}

/** 解析 variants 下的 color 列表（仅取颜色做筛选/打点） */
function getVariantColors(attrs: any): string[] {
  const arr: any[] = Array.isArray(attrs?.variants?.data)
    ? attrs.variants.data
    : Array.isArray(attrs?.variants)
    ? attrs.variants
    : [];
  const set = new Set<string>();
  for (const r of arr) {
    const a = r?.attributes ?? r ?? {};
    const c = normalizeColorName(a.color ?? "");
    if (c) set.add(c);
  }
  return Array.from(set);
}

/** ✅ 常见字母尺码顺序；数字尺码按数值升序；其他按字母序 */
const SIZE_ORDER: Record<string, number> = {
  xxs: 0,
  xs: 1,
  s: 2,
  m: 3,
  l: 4,
  xl: 5,
  xxl: 6,
  xxxl: 7,
};
function sortSizes(arr: string[]) {
  return arr.slice().sort((a, b) => {
    const aa = a.trim().toLowerCase();
    const bb = b.trim().toLowerCase();
    const oa = SIZE_ORDER[aa];
    const ob = SIZE_ORDER[bb];
    if (oa != null && ob != null) return oa - ob;
    const na = parseFloat(String(aa));
    const nb = parseFloat(String(bb));
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return aa.localeCompare(bb);
  });
}
/** ✅ 解析 variants 下的 size 列表（用于卡片展示） */
function getVariantSizes(attrs: any): string[] {
  const arr: any[] = Array.isArray(attrs?.variants?.data)
    ? attrs.variants.data
    : Array.isArray(attrs?.variants)
    ? attrs.variants
    : [];
  const set = new Set<string>();
  for (const r of arr) {
    const a = r?.attributes ?? r ?? {};
    const s = String(a.size ?? "").trim();
    if (s) set.add(s);
  }
  return sortSizes(Array.from(set));
}

/** ✅ 从 Strapi attributes 解析 Price 组件数组（强制数值化） */
function getPrices(attrs: any): PriceRec[] {
  const arr: any[] = Array.isArray(attrs?.prices)
    ? attrs.prices
    : Array.isArray(attrs?.prices?.data)
    ? attrs.prices.data
    : [];

  const out: PriceRec[] = [];
  for (const p of arr) {
    const a = p?.attributes ?? p ?? {};

    const currency = String(a.currency ?? "").toUpperCase();
    if (!currency) continue;

    // 统一数值化（有些后端会返回 "85" 这样的字符串）
    const amountMinorNum = Number(a.amount_minor);
    const priceNum = Number(a.price);
    const discountNum = Number(a.discount);
    const dpoNum = Number(a.discount_percent_off);

    out.push({
      currency, // e.g. "AUD"

      // 若有 amount_minor 优先用（单位：分）；否则保留 price（单位：元），兜底函数会处理
      amount_minor: Number.isFinite(amountMinorNum) ? Math.round(amountMinorNum) : undefined,
      price: Number.isFinite(priceNum) ? priceNum : undefined,

      // 两种折扣字段都兼容
      discount: Number.isFinite(discountNum) ? discountNum : undefined,                   // 85 => 85%
      discount_percent_off: Number.isFinite(dpoNum) ? dpoNum : undefined,                // 24 => 24% OFF

      sale_starts_at: a.sale_starts_at ?? undefined,
      sale_ends_at: a.sale_ends_at ?? undefined,
    } as PriceRec);
  }
  return out;
}

/** 旧字段兜底的货币字符串 */
function formatPriceVal(n: number | null, currency?: string | null, locale?: string) {
  if (n == null) return "—";
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(Number(n));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 旧字段促销窗口判断（保留兜底） */
function isSaleActiveByLegacy(p: ProductLite) {
  const pct = p.discountPercent ?? 0;
  if (!pct || pct <= 0) return false;
  const now = Date.now();
  const s = p.saleStartsAt ? Date.parse(p.saleStartsAt) : Number.NaN;
  const e = p.saleEndsAt ? Date.parse(p.saleEndsAt) : Number.NaN;
  const started = Number.isNaN(s) ? true : now >= s;
  const notEnded = Number.isNaN(e) ? true : now <= e;
  return started && notEnded;
}
function salePriceLegacy(p: ProductLite) {
  const base = p.price ?? 0;
  const pct = p.discountPercent ?? 0;
  return Math.max(0, base * (1 - pct / 100));
}

function normalizeProduct(row: any): ProductLite {
  const attrs = row?.attributes ?? row ?? {};
  const name: string = attrs.title ?? attrs.name ?? attrs.slug ?? "Product";

  // base_price_cents → 元（保底用）
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? Math.max(0, cents) / 100 : null;
  const currency: string | undefined = (attrs.currency ?? "AUD") as string;

  // ✅ 新价格（来自 Price 组件）
  const prices = getPrices(attrs);

  // 主图/颜色图片来自 product.color_galleries
  const variantsByColor = getImagesByColorFromProduct(attrs);

  // 颜色集合：color_galleries + variants.color（去重）
  const set = new Set<string>(Object.keys(variantsByColor));
  for (const c of getVariantColors(attrs)) set.add(c);
  const colors = Array.from(set);

  // ✅ 尺码集合：variants.size
  const sizes = getVariantSizes(attrs);

  // 任意首图（兜底）：取映射里的第一张
  let imageUrl: string | undefined;
  for (const k of Object.keys(variantsByColor)) {
    if (variantsByColor[k]?.[0]) {
      imageUrl = variantsByColor[k][0];
      break;
    }
  }

  const key =
    String(row?.id ?? "") ||
    String(attrs.documentId ?? "") ||
    String(attrs.slug ?? "") ||
    `${name}-${Math.random().toString(36).slice(2)}`;

  const discountPercent: number | undefined =
    typeof attrs.discount_percent_off === "number" ? attrs.discount_percent_off : undefined;

  return {
    key,
    slug: attrs.slug,
    name,
    prices,
    price,
    currency,
    imageUrl,
    discountPercent,
    saleStartsAt: attrs.sale_starts_at ?? null,
    saleEndsAt: attrs.sale_ends_at ?? null,
    hotScore: typeof attrs.hot_score === "number" ? attrs.hot_score : null,
    colors,
    sizes,
    variantsByColor,
  };
}


// ============ Main ============
export default function CategoryGridClient({
  slug,
  title,
  total,
  pageSize = 40,
  categoryDocIds,
  displayCurrency = "AUD", // ★ 默认展示币种
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  // === Refs：无障碍焦点管理 ===
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // === Sort（来自 URL） ===
  const sortKey = (sp.get("sort") as SortKey) || "default";
  const setSortInUrl = (next: SortKey) => {
    const u = new URL(window.location.href);
    if (next === "default") u.searchParams.delete("sort");
    else u.searchParams.set("sort", next);
    u.searchParams.set("page", "1");
    router.replace(`/category/${slug}${u.search}`);
  };

  // 已应用的筛选（来自 URL）
  const minParam = sp.get("min");
  const maxParam = sp.get("max");
  const appliedMin = useMemo(() => (minParam ? Math.max(0, Number(minParam)) : undefined), [minParam]);
  const appliedMax = useMemo(() => (maxParam ? Math.max(0, Number(maxParam)) : undefined), [maxParam]);
  const appliedMaterials = useMemo(() => parseCSV(sp, "material"), [sp]);
  const appliedSizes = useMemo(() => parseCSV(sp, "size"), [sp]);
  const appliedColors = useMemo(() => parseCSV(sp, "color"), [sp]);
  const appliedGenders = useMemo(() => parseCSV(sp, "gender"), [sp]); // product 级别

  // 分页（基于筛选后的总数）
  const pageParam = sp.get("page");
  const [filteredTotal, setFilteredTotal] = useState<number>(total);
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const page = (() => {
    const n = Number(pageParam ?? "1");
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, pageCount);
  })();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ProductLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Facets
  const [facetMaterials, setFacetMaterials] = useState<string[]>([]);
  const [facetSizes, setFacetSizes] = useState<string[]>([]);
  const [facetColors, setFacetColors] = useState<string[]>([]);
  const [facetGenders, setFacetGenders] = useState<string[]>([]);
  const [variantFiltersSupported, setVariantFiltersSupported] = useState(true);
  const [productGenderSupported, setProductGenderSupported] = useState(true);

  // Drawer 草稿值
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState<number | undefined>(appliedMin);
  const [draftMax, setDraftMax] = useState<number | undefined>(appliedMax);
  const [draftMaterials, setDraftMaterials] = useState<Set<string>>(new Set(appliedMaterials));
  const [draftSizes, setDraftSizes] = useState<Set<string>>(new Set(appliedSizes));
  const [draftColors, setDraftColors] = useState<Set<string>>(new Set(appliedColors));
  const [draftGenders, setDraftGenders] = useState<Set<string>>(new Set(appliedGenders));

  // 打开抽屉时，用已应用的筛选值重置草稿
  useEffect(() => {
    if (open) {
      setDraftMin(appliedMin);
      setDraftMax(appliedMax);
      setDraftMaterials(new Set(appliedMaterials));
      setDraftSizes(new Set(appliedSizes));
      setDraftColors(new Set(appliedColors));
      setDraftGenders(new Set(appliedGenders));
    }
  }, [open]); // eslint-disable-line

  // 打开后把焦点放到 Close；Esc 关闭并把焦点还给 Filter
  useEffect(() => {
    if (!open) return;
    setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement | null)?.blur?.();
        setOpen(false);
        setTimeout(() => triggerBtnRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 拉 facets：variants(size/color/material) + product(gender)
  useEffect(() => {
    let aborted = false;
    async function fetchFacets() {
      const partsForProducts: string[] = [];
      const partsForVariants: string[] = [];
      if (categoryDocIds?.length) {
        categoryDocIds.forEach((id, i) => {
          const enc = encodeURIComponent(id);
          partsForProducts.push(`filters[category][documentId][$in][${i}]=${enc}`);
          partsForVariants.push(`filters[product][category][documentId][$in][${i}]=${enc}`);
        });
      } else {
        const enc = encodeURIComponent(slug);
        partsForProducts.push(`filters[category][slug][$eq]=${enc}`);
        partsForVariants.push(`filters[product][category][slug][$eq]=${enc}`);
      }
      // 仅统计/展示「被上架显示」的商品
      partsForProducts.push(`filters[is_showed][$eq]=true`);
      partsForVariants.push(`filters[product][is_showed][$eq]=true`);
      // 仅统计已上架的变体
      partsForVariants.push(`filters[is_showed][$eq]=true`);

      try {
        // variants -> size/color/material
        const qsV =
          `/api/variants?${partsForVariants.join("&")}` +
          `&fields[0]=material&fields[1]=size&fields[2]=color` +
          `&pagination[pageSize]=500&publicationState=live`;
        dbg("facets:variants GET", qsV);

        const [vJson, pJson] = await Promise.all([
          api(qsV, { noCache: true }).catch((e) => {
            dbg("facets:variants error", e?.message || e);
            setVariantFiltersSupported(false);
            return null;
          }),
          api(
            `/api/products?${partsForProducts.join("&")}` +
              `&fields[0]=gender&pagination[pageSize]=500&publicationState=live`,
            { noCache: true }
          ).catch((e) => {
            dbg("facets:products(gender) error", e?.message || e);
            setProductGenderSupported(false);
            return null;
          }),
        ]);

        if (!aborted && vJson) {
          const rows: any[] = Array.isArray(vJson?.data) ? vJson.data : [];
          const m = new Set<string>();
          const s = new Set<string>();
          const c = new Set<string>();
          for (const r of rows) {
            const a = r?.attributes ?? r ?? {};
            if (a.material && String(a.material).trim()) m.add(String(a.material).trim());
            if (a.size && String(a.size).trim()) s.add(String(a.size).trim());
            if (a.color && String(a.color).trim()) c.add(normalizeColorName(a.color));
          }
          setFacetMaterials(Array.from(m).sort((a, b) => a.localeCompare(b)));
          setFacetSizes(sortSizes(Array.from(s)));
          setFacetColors(Array.from(c).sort((a, b) => a.localeCompare(b)));
        }

        if (!aborted && pJson) {
          const rows: any[] = Array.isArray(pJson?.data) ? pJson.data : [];
          const g = new Set<string>();
          for (const r of rows) {
            const a = r?.attributes ?? r ?? {};
            const v = a.gender;
            if (v && String(v).trim()) g.add(String(v).trim());
          }
          setFacetGenders(Array.from(g).sort((a, b) => a.localeCompare(b)));
        }
      } catch {
        /* ignore */
      }
    }
    fetchFacets();
    return () => {
      aborted = true;
    };
  }, [slug, JSON.stringify(categoryDocIds)]); // eslint-disable-line

  // ===== 排序串：把 sortKey 转为 Strapi 的 sort[...] 查询参数 =====
  const sortQueryString = useMemo(() => {
    switch (sortKey) {
      case "price-desc":
        return `&sort[0]=base_price_cents:desc&sort[1]=priority:asc`;
      case "price-asc":
        return `&sort[0]=base_price_cents:asc&sort[1]=priority:asc`;
      case "hot":
        return `&sort[0]=hot_score:desc&sort[1]=priority:asc`;
      default:
        return `&sort[0]=priority:asc&sort[1]=updatedAt:desc`;
    }
  }, [sortKey]);

  // 拉取产品（按筛选+分页+排序）
  useEffect(() => {
    let aborted = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const parts: string[] = [];
        // 分类
        if (categoryDocIds?.length) {
          categoryDocIds.forEach((id, i) =>
            parts.push(`filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`)
          );
        } else {
          parts.push(`filters[category][slug][$eq]=${encodeURIComponent(slug)}`);
        }

        // 仅展示「被上架显示」的商品
        parts.push(`filters[is_showed][$eq]=true`);

        // 价格（元→分）— 这仍旧基于旧字段做筛选（保留）
        const minCents = toCents(appliedMin);
        const maxCents = toCents(appliedMax);
        if (typeof minCents === "number") parts.push(`filters[base_price_cents][$gte]=${minCents}`);
        if (typeof maxCents === "number") parts.push(`filters[base_price_cents][$lte]=${maxCents}`);

        // product 级（gender）
        if (appliedGenders.length) {
          appliedGenders.forEach((v, i) =>
            parts.push(`filters[gender][$in][${i}]=${encodeURIComponent(v)}`)
          );
        }

        // variant 级（material / size / color）
        const pushIN = (key: string, arr: string[]) => {
          arr.forEach((v, i) =>
            parts.push(`filters[variants][${key}][$in][${i}]=${encodeURIComponent(v)}`)
          );
        };

        // ✅✅✅ color 专用：OR + containsi（大小写不敏感、也能容忍 Tan/tan/空格差异）
        const pushColorORContainsI = (colors: string[]) => {
          colors
            .map((v) => String(v || "").trim())
            .filter(Boolean)
            .forEach((v, i) => {
              parts.push(
                `filters[$or][${i}][variants][color][$containsi]=${encodeURIComponent(v)}`
              );
            });
        };

        if (appliedMaterials.length) pushIN("material", appliedMaterials);
        if (appliedSizes.length) pushIN("size", appliedSizes);

        // ✅ 仅这一行改变：colors 不再用 $in 精确匹配
        if (appliedColors.length) pushColorORContainsI(appliedColors);

        // ✅ 关键：把 prices 一起取回
        const qs =
          `/api/products?${parts.join("&")}` +
          `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
          `&fields[4]=discount_percent_off&fields[5]=sale_starts_at&fields[6]=sale_ends_at&fields[7]=hot_score&fields[8]=priority` +
          `&populate[color_galleries][fields][0]=color` +
          `&populate[color_galleries][populate][images]=true` +
          `&populate[variants][fields][0]=color&populate[variants][fields][1]=size` +
          `&populate[prices]=*` +                           // ← 这里改成 *（不要逐个 fields）
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `${sortQueryString}&publicationState=live`;


        dbg("appliedColors", appliedColors);
        dbg("parts(color)", parts.filter((p) => p.includes("color")));
        dbg("final parts count", parts.length);
        dbg("products:GET", qs);

        const json = await api(qs, { noCache: true });
        const rows: any[] = Array.isArray(json?.data) ? json.data : [];
        const totalMeta = Number(json?.meta?.pagination?.total ?? 0);

        if (!aborted) {
          setFilteredTotal(totalMeta || 0);
          setList(rows.map(normalizeProduct));
        }
      } catch (e: any) {
        if (!aborted) {
          setError(e?.message || "Failed to load products");
          setList([]);
          setFilteredTotal(0);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    run();
    return () => {
      aborted = true;
    };
  }, [
    slug,
    JSON.stringify(categoryDocIds),
    page,
    pageSize,
    appliedMin,
    appliedMax,
    appliedGenders.join(","),
    appliedMaterials.join(","),
    appliedSizes.join(","),
    appliedColors.join(","),
    sortQueryString,
  ]);

  const start = (page - 1) * pageSize;

  // === 固定“画布高度”：按 40 个商品、4 列来估算一页高度 ===
  const desktopColumns = 4;                  // 桌面端默认 4 列
  const rowsForFullPage = Math.ceil(pageSize / desktopColumns); // 40 / 4 = 10 行
  const approxRowHeight = 520;               // 每一行大约高度（px），可按视觉微调
  const fullPageHeightPx = rowsForFullPage * approxRowHeight;

  // 让商品区域至少有“40 个商品排满”的高度，但不要拉伸卡片
  const sectionMinHeightStyle: CSSProperties = {
    minHeight: fullPageHeightPx,
  };

  const hrefForPage = useMemo(
    () => (p: number) => {
      const u = new URL(window.location.href);
      u.searchParams.set("page", String(p));
      return `/category/${slug}${u.search}`;
    },
    [slug]
  );

  const resultLabel = `${filteredTotal} ${filteredTotal === 1 ? "result" : "results"}`;

  // 统一关闭抽屉（焦点回退）
  const closeDrawer = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  // 提交筛选
  const applyDraft = () => {
    const u = new URL(window.location.href);

    if (typeof draftMin === "number" && draftMin >= 0) u.searchParams.set("min", String(draftMin));
    else u.searchParams.delete("min");

    if (typeof draftMax === "number" && draftMax >= 0) u.searchParams.set("max", String(draftMax));
    else u.searchParams.delete("max");

    const setCSV = (key: string, set: Set<string>) => {
      const arr = Array.from(set).filter(Boolean);
      if (arr.length) u.searchParams.set(key, arr.join(","));
      else u.searchParams.delete(key);
    };
    setCSV("material", draftMaterials);
    setCSV("size", draftSizes);
    setCSV("color", draftColors);
    setCSV("gender", draftGenders);

    u.searchParams.set("page", "1");

    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    router.replace(`/category/${slug}${u.search}`);
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  const resetDraft = () => {
    setDraftMin(undefined);
    setDraftMax(undefined);
    setDraftMaterials(new Set());
    setDraftSizes(new Set());
    setDraftColors(new Set());
    setDraftGenders(new Set());
  };

  return (
    <>
      <CategoryHeader
        title={title}
        slug={slug}
        resultLabel={resultLabel}
        sortKey={sortKey}
        setSortInUrl={setSortInUrl}
        onOpenFilter={() => setOpen(true)}
        triggerBtnRef={triggerBtnRef}
      />

      {/* === 左侧抽屉 === */}
      <FilterDrawer
        open={open}
        onClose={closeDrawer}
        closeBtnRef={closeBtnRef}
        variantFiltersSupported={variantFiltersSupported}
        productGenderSupported={productGenderSupported}
        facetMaterials={facetMaterials}
        facetSizes={facetSizes}
        facetColors={facetColors}
        facetGenders={facetGenders}
        draftMin={draftMin}
        setDraftMin={setDraftMin}
        draftMax={draftMax}
        setDraftMax={setDraftMax}
        draftMaterials={draftMaterials}
        setDraftMaterials={setDraftMaterials}
        draftSizes={draftSizes}
        setDraftSizes={setDraftSizes}
        draftColors={draftColors}
        setDraftColors={setDraftColors}
        draftGenders={draftGenders}
        setDraftGenders={setDraftGenders}
        onReset={resetDraft}
        onApply={applyDraft}
      />


      {/* ====== 列表 ====== */}
      <ProductGrid
        error={error}
        loading={loading}
        list={list}
        start={start}
        pageSize={pageSize}
        filteredTotal={filteredTotal}
        sectionMinHeightStyle={sectionMinHeightStyle}
        displayCurrency={displayCurrency}
        pickPriceForCurrency={pickPriceForCurrency}
        formatPriceForCard={formatPriceForCard}
        formatPriceVal={formatPriceVal}
        isSaleActiveByLegacy={isSaleActiveByLegacy}
        salePriceLegacy={salePriceLegacy}
      />

      <Pagination page={page} pageCount={pageCount} hrefForPage={hrefForPage} className="mb-10" />
    </>
  );
}
