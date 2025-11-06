// src/app/category/[slug]/CategoryGridClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination/Pagination";
import { api, mediaUrl } from "@/lib/strapi";
import { Button } from "@/components/ui/button";
import { X, Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

// 颜色工具
import { normalizeColorName, colorNameToCss } from "@/lib/colors";

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

const SORT_LABELS: Record<SortKey, string> = {
  default: "Default",
  "price-desc": "Price: High → Low",
  "price-asc": "Price: Low → High",
  hot: "Popularity",
};

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

function CardSkeleton() {
  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="h-[260px] sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px] bg-muted animate-pulse" />
      <div className="p-6 md:p-8 space-y-3">
        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      </div>
    </article>
  );
}

/** 图片轮播（左右箭头切换） */
function ImageCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const count = urls.length;

  useEffect(() => {
    setIdx(0);
  }, [urls?.join("|")]);

  if (!count) {
    return (
      <div className="h-[260px] sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px] bg-muted flex items-center justify-center text-muted-foreground">
        No Image
      </div>
    );
  }

  const go = (delta: number) => setIdx((i) => (i + delta + count) % count);

  return (
    <div className="relative h-[260px] sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px] bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} src={urls[idx]} className="h-full w-full object-cover" loading="lazy" />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow p-1 z-20"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-5 w-5 text-neutral-800" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow p-1 z-20"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-5 w-5 text-neutral-800" />
          </button>
        </>
      )}
    </div>
  );
}

/** 单个卡片：点击图片或标题跳到详情页 */
function ProductCard({
  p,
  idx,
  start,
  displayCurrency,
}: {
  p: ProductLite;
  idx: number;
  start: number;
  displayCurrency: string;
}) {
  const [selectedColor, setSelectedColor] = useState<string | null>(p.colors?.[0] ?? null);

  // 热度星级（0~5）
  let stars = p.hotScore ?? 0;
  if (stars > 5) stars = Math.round(clamp(stars, 0, 100) / 20);
  stars = clamp(Math.round(stars), 0, 5);

  // 图片选择
  const colorKey = selectedColor ? normalizeColorName(selectedColor) : null;
  const byColor = colorKey && p.variantsByColor[colorKey];
  const anyColor =
    byColor && byColor.length
      ? byColor
      : (() => {
          for (const arr of Object.values(p.variantsByColor)) {
            if (arr?.length) return arr;
          }
          return [];
        })();
  const urls = (byColor && byColor.length ? byColor : anyColor) || (p.imageUrl ? [p.imageUrl] : []);

  // ✅ 选中币种并计算原价/折后价
  const pick = pickPriceForCurrency(p.prices, displayCurrency) || null;

  // 原价（最小货币单位）
  const baseMinor: number | null =
    pick?.base_minor ??
    (typeof p.price === "number" ? Math.round(Math.max(0, p.price) * 100) : null);

  // 折后价（最小货币单位）
  const effectiveMinor: number | null =
    pick?.effective_minor ?? baseMinor;

  // 折扣百分比（仅当有折扣且小于原价才显示）
  let discountPct: number | null = null;
  if (
    typeof baseMinor === "number" &&
    typeof effectiveMinor === "number" &&
    baseMinor > 0 &&
    effectiveMinor < baseMinor
  ) {
    discountPct = Math.round((1 - effectiveMinor / baseMinor) * 100);
  }

  // 展示字符串
const showCcy = pick?.currency || displayCurrency;

const displayBase = typeof baseMinor === "number" ? fmtMoneyMinor(baseMinor, showCcy) : null;

const displayEff =
  typeof effectiveMinor === "number"
    ? fmtMoneyMinor(effectiveMinor, showCcy)
      : p.price != null
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: (p.currency || "AUD").toUpperCase(),
          maximumFractionDigits: 2,
        }).format(Number(p.price))
      : "No price";

  // 旧字段保底（如果没拿到 pick 并且有旧折扣窗口）
  const legacyOnSale = !pick && isSaleActiveByLegacy(p);
  const legacySalePrice = legacyOnSale ? salePriceLegacy(p) : null;

  return (
    <article className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <ImageCarousel urls={urls} alt={p.name || `Image #${start + idx + 1}`} />
        {p.slug && (
          <Link href={`/product/${p.slug}`} aria-label={`View ${p.name}`} className="absolute inset-0 z-10" />
        )}
      </div>

      <div className="p-6 md:p-8">
        {/* 1. 名称（点击到详情） */}
        <h3 className="text-lg md:text-xl font-semibold line-clamp-1">
          {p.slug ? (
            <Link href={`/product/${p.slug}`} className="hover:underline">
              {p.name || `Product #${start + idx + 1}`}
            </Link>
          ) : (
            p.name || `Product #${start + idx + 1}`
          )}
        </h3>

        {/* 2. 折扣文案（新规则） */}
        {discountPct != null && (
          <p className="mt-1 text-base font-semibold text-emerald-700 uppercase tracking-wide">
            {discountPct}% OFF
          </p>
        )}

        {/* 3. 价格区（优先新规则；无则回退旧字段） */}
        <div className="mt-2">
          {/* 新规则：有折扣 => 原价加删除线 + 竖线 + 折后价 */}
          {discountPct != null && displayBase ? (
            <div className="flex items-baseline gap-2">
              <span className="text-base text-neutral-400 line-through">{displayBase}</span>
              <span className="text-neutral-300">|</span>
              <span className="text-base font-bold text-emerald-700">{displayEff}</span>
            </div>
          ) : legacyOnSale && legacySalePrice != null ? (
            // 旧字段兜底逻辑
            <div className="flex items-baseline gap-2">
              <span className="text-base text-neutral-400 line-through">
                {formatPriceVal(p.price, p.currency)}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-base font-bold text-emerald-700">
                {formatPriceVal(legacySalePrice, p.currency)}
              </span>
            </div>
          ) : (
            // 无折扣：仅展示一个价格
            <div className="text-base font-bold">{displayEff}</div>
          )}
        </div>

        {/* 4. 颜色（可点击切图） */}
        {p.colors && p.colors.length > 0 && (
          <div className="mt-3 flex items-center gap-2.5">
            {p.colors.slice(0, 8).map((c) => {
              const normalized = normalizeColorName(c);
              const active = normalizeColorName(selectedColor) === normalized;
              return (
                <button
                  key={normalized}
                  type="button"
                  title={c}
                  aria-pressed={active}
                  onClick={() => setSelectedColor(normalized)}
                  className={[
                    "relative inline-flex h-6 w-6 items-center justify-center rounded-full",
                    active
                      ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white"
                      : "ring-1 ring-black/10 hover:ring-black/30",
                    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
                  ].join(" ")}
                >
                  <span
                    className="block h-6 w-6 rounded-full"
                    style={{ backgroundColor: colorNameToCss(normalized) }}
                  />
                </button>
              );
            })}
            {p.colors.length > 8 && (
              <span className="text-xs text-neutral-500">+{p.colors.length - 8}</span>
            )}
          </div>
        )}

        {/* 5. 尺码 */}
        {p.sizes && p.sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {p.sizes.slice(0, 10).map((sz) => (
              <span
                key={sz}
                className="px-2 py-0.5 rounded-full border text-xs leading-5 bg-white"
                title={`Size ${sz}`}
              >
                {sz}
              </span>
            ))}
            {p.sizes.length > 10 && (
              <span className="text-xs text-neutral-500">+{p.sizes.length - 10}</span>
            )}
          </div>
        )}

        {/* 6. 热度（星级） */}
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i3) => (
            <Star
              key={i3}
              className={i3 < (stars as number) ? "h-4 w-4 fill-black text-black" : "h-4 w-4 text-neutral-300"}
            />
          ))}
        </div>
      </div>
    </article>
  );
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
        if (appliedMaterials.length) pushIN("material", appliedMaterials);
        if (appliedSizes.length) pushIN("size", appliedSizes);
        if (appliedColors.length) pushIN("color", appliedColors);

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
      <header className="mb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-neutral-600">
              Category: <code className="font-mono">{slug}</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm md:text-base text-neutral-600 whitespace-nowrap">{resultLabel}</div>

            {/* Sort */}
            <div className="hidden sm:flex">
              <Select value={sortKey} onValueChange={(v) => setSortInUrl(v as SortKey)}>
                <SelectTrigger
                  className="rounded-full w-[190px] border px-3 py-2 text-sm focus:ring-2 focus:ring-black/10"
                  aria-label="Sort products"
                >
                  <SelectValue placeholder="Sort">{SORT_LABELS[sortKey] ?? "Sort"}</SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="z-50 rounded-xl border shadow-lg">
                  <SelectGroup>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price-desc">Price: High → Low</SelectItem>
                    <SelectItem value="price-asc">Price: Low → High</SelectItem>
                    <SelectItem value="hot">Popularity</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Button ref={triggerBtnRef} variant="outline" className="rounded-full px-5" onClick={() => setOpen(true)}>
              Filter
            </Button>
          </div>
        </div>
      </header>

      {/* === 左侧抽屉 === */}
      <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* 背景遮罩 */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={closeDrawer}
        />
        {/* 面板 */}
        <aside
          role="dialog"
          aria-modal="true"
          className={`absolute left-0 top-0 h-full w-[92vw] sm:w-[380px] bg-white shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filter by</h2>
            <button
              ref={closeBtnRef}
              onClick={closeDrawer}
              aria-label="Close filter panel"
              title="Close"
              className="rounded-full p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <X className="h-5 w-5 text-neutral-600" />
            </button>
          </div>

          <div className="h-[calc(100%-120px)] overflow-y-auto p-4">
            {/* 你的筛选控件...（与原文件一致） */}
          </div>

          <div className="p-4 border-t flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={resetDraft}>
              Reset
            </Button>
            <Button onClick={applyDraft}>Apply</Button>
          </div>
        </aside>
      </div>

      {/* ====== 列表 ====== */}
      {error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : loading ? (
        <section>
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {Array.from({ length: Math.min(pageSize, filteredTotal - start) || 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : list.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No products yet.</div>
      ) : (
        <section>
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {list.map((p, idx) => (
              <ProductCard key={p.key} p={p} idx={idx} start={start} displayCurrency={displayCurrency} />
            ))}
          </div>
        </section>
      )}

      <Pagination page={page} pageCount={pageCount} hrefForPage={hrefForPage} className="mb-10" />
    </>
  );
}
