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
// ✅ 统一颜色工具（与详情页共用）
import { normalizeColorName, colorNameToCss } from "@/lib/colors";



type Props = {
  slug: string;
  title: string;
  /** 初始总数（未筛选）。应用筛选后会用接口返回的 filteredTotal 覆盖 */
  total: number;
  pageSize?: number;
  /** 顶级分类 = 自身 + 子分类 documentId，用于 $in 过滤 */
  categoryDocIds?: string[];
};

type ProductLite = {
  key: string;
  slug?: string; // 用于详情页路由
  name: string;
  price: number | null;
  currency?: string | null;

  /** 折扣与时间窗/Popularity */
  discountPercent?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  hotScore?: number | null;

  /** 可选颜色（来自 variants.color 与/或 color_galleries.color） */
  colors?: string[];

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
    : [];
  const out: Record<string, string[]> = {};
  for (const cg of arr) {
    const colorRaw = (cg?.color ?? cg?.attributes?.color) as
      | string
      | undefined;
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

// 价格/折扣/Popularity
function formatPriceVal(
  n: number | null,
  currency?: string | null,
  locale?: string
) {
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
function isSaleActive(p: ProductLite) {
  const pct = p.discountPercent ?? 0;
  if (!pct || pct <= 0) return false;
  const now = Date.now();
  const s = p.saleStartsAt ? Date.parse(p.saleStartsAt) : Number.NaN;
  const e = p.saleEndsAt ? Date.parse(p.saleEndsAt) : Number.NaN;
  const started = Number.isNaN(s) ? true : now >= s;
  const notEnded = Number.isNaN(e) ? true : now <= e;
  return started && notEnded;
}
function salePrice(p: ProductLite) {
  const base = p.price ?? 0;
  const pct = p.discountPercent ?? 0;
  return Math.max(0, base * (1 - pct / 100));
}

function normalizeProduct(row: any): ProductLite {
  const attrs = row?.attributes ?? row ?? {};
  const name: string = attrs.title ?? attrs.name ?? attrs.slug ?? "Product";

  // base_price_cents → 元
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? Math.max(0, cents) / 100 : null;

  const currency: string | undefined = (attrs.currency ?? "AUD") as string;

  // 主图/颜色图片来自 product.color_galleries
  const variantsByColor = getImagesByColorFromProduct(attrs);

  // 颜色集合：color_galleries + variants.color（去重）
  const set = new Set<string>(Object.keys(variantsByColor));
  for (const c of getVariantColors(attrs)) set.add(c);
  const colors = Array.from(set);

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
    typeof attrs.discount_percent_off === "number"
      ? attrs.discount_percent_off
      : undefined;

  return {
    key,
    slug: attrs.slug,
    name,
    price,
    currency,
    imageUrl,
    discountPercent,
    saleStartsAt: attrs.sale_starts_at ?? null,
    saleEndsAt: attrs.sale_ends_at ?? null,
    hotScore: typeof attrs.hot_score === "number" ? attrs.hot_score : null,
    colors,
    variantsByColor,
  };
}

function CardSkeleton() {
  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
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

  // 颜色/图片数组切换时重置到第一张
  useEffect(() => {
    setIdx(0);
  }, [urls?.join("|")]);

  if (!count) {
    return (
      <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground">
        No Image
      </div>
    );
  }

  const go = (delta: number) => setIdx((i) => (i + delta + count) % count);

  return (
    <div className="relative aspect-[4/3] bg-muted">
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
function ProductCard({ p, idx, start }: { p: ProductLite; idx: number; start: number }) {
  const [selectedColor, setSelectedColor] = useState<string | null>(
    p.colors?.[0] ?? null
  );

  const onSale = isSaleActive(p);
  const finalPrice = onSale ? salePrice(p) : p.price ?? 0;

  // 折扣是否快结束（≤7天）
  const endsSoon =
    onSale &&
    p.saleEndsAt &&
    !Number.isNaN(Date.parse(p.saleEndsAt)) &&
    Date.parse(p.saleEndsAt) - Date.now() <= 7 * 24 * 3600 * 1000;

  // 热度星级（0~5）
  let stars = p.hotScore ?? 0;
  if (stars > 5) stars = Math.round(clamp(stars, 0, 100) / 20);
  stars = clamp(Math.round(stars), 0, 5);

  // 优先用选中颜色的图片；否则取任意颜色；再否则用兜底首图
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

  const urls =
    (byColor && byColor.length ? byColor : anyColor) || (p.imageUrl ? [p.imageUrl] : []);

  return (
    <article className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* 图片区 + 覆盖式链接 */}
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

        {/* 2. 折扣文案 */}
        {onSale && (
          <p className="mt-1 text-base font-semibold text-emerald-700 uppercase tracking-wide">
            {p.discountPercent}% OFF {endsSoon ? "ENDS SOON" : ""}
          </p>
        )}

        {/* 3. 价格区 */}
        <div className="mt-2">
          {onSale ? (
            <div className="flex items-baseline gap-2">
              <span className="text-base text-neutral-400 line-through">
                {formatPriceVal(p.price, p.currency)}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-base font-bold text-emerald-700">
                {formatPriceVal(finalPrice, p.currency)}
              </span>
            </div>
          ) : (
            <div className="text-base font-bold">
              {formatPriceVal(finalPrice, p.currency)}
            </div>
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
                  // 更大的点击热区（32px）
                  "relative inline-flex h-6 w-6 items-center justify-center rounded-full",
                  // 选中 & hover 的边框效果
                  active
                    ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white"
                    : "ring-1 ring-black/10 hover:ring-black/30",
                  // 无障碍焦点可见
                  "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
                ].join(" ")}
              >
                {/* 实际可见的色点（20px） */}
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

        {/* 5. 热度（星级） */}
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i3) => (
            <Star
              key={i3}
              className={
                i3 < (stars as number)
                  ? "h-4 w-4 fill-black text-black"
                  : "h-4 w-4 text-neutral-300"
              }
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
  const appliedMin = useMemo(
    () => (minParam ? Math.max(0, Number(minParam)) : undefined),
    [minParam]
  );
  const appliedMax = useMemo(
    () => (maxParam ? Math.max(0, Number(maxParam)) : undefined),
    [maxParam]
  );
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
  const [productGenderSupported, setProductGenderSupported] =
    useState(true);

  // Drawer 草稿值
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState<number | undefined>(appliedMin);
  const [draftMax, setDraftMax] = useState<number | undefined>(appliedMax);
  const [draftMaterials, setDraftMaterials] = useState<Set<string>>(
    new Set(appliedMaterials)
  );
  const [draftSizes, setDraftSizes] = useState<Set<string>>(
    new Set(appliedSizes)
  );
  const [draftColors, setDraftColors] = useState<Set<string>>(
    new Set(appliedColors)
  );
  const [draftGenders, setDraftGenders] = useState<Set<string>>(
    new Set(appliedGenders)
  );

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
          partsForProducts.push(
            `filters[category][documentId][$in][${i}]=${enc}`
          );
          partsForVariants.push(
            `filters[product][category][documentId][$in][${i}]=${enc}`
          );
        });
      } else {
        const enc = encodeURIComponent(slug);
        partsForProducts.push(`filters[category][slug][$eq]=${enc}`);
        partsForVariants.push(
            `filters[product][category][slug][$eq]=${enc}`
        );
      }
      // 仅统计/展示「被上架显示」的商品
      partsForProducts.push(`filters[is_showed][$eq]=true`);
      partsForVariants.push(`filters[product][is_showed][$eq]=true`);
      // 仅统计已上架的变体（如果你在 Variant 上用了 is_showed）
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
          // products -> gender（product 级别）
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
            if (a.material && String(a.material).trim())
              m.add(String(a.material).trim());
            if (a.size && String(a.size).trim())
              s.add(String(a.size).trim());
            if (a.color && String(a.color).trim())
              c.add(normalizeColorName(a.color));
          }
          setFacetMaterials(Array.from(m).sort((a, b) => a.localeCompare(b)));
          setFacetSizes(Array.from(s).sort((a, b) => a.localeCompare(b)));
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
        /* 已在各自 catch 里处理 */
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
            parts.push(
              `filters[category][documentId][$in][${i}]=${encodeURIComponent(
                id
              )}`
            )
          );
        } else {
          parts.push(`filters[category][slug][$eq]=${encodeURIComponent(slug)}`);
        }

        // 仅展示「被上架显示」的商品
        parts.push(`filters[is_showed][$eq]=true`);

        // 价格（元→分）
        const minCents = toCents(appliedMin);
        const maxCents = toCents(appliedMax);
        if (typeof minCents === "number")
          parts.push(`filters[base_price_cents][$gte]=${minCents}`);
        if (typeof maxCents === "number")
          parts.push(`filters[base_price_cents][$lte]=${maxCents}`);

        // product 级（gender）
        if (productGenderSupported && appliedGenders.length) {
          appliedGenders.forEach((v, i) =>
            parts.push(
              `filters[gender][$in][${i}]=${encodeURIComponent(v)}`
            )
          );
        }

        // variant 级（material / size / color）
        if (variantFiltersSupported) {
          const pushIN = (key: string, arr: string[]) => {
            arr.forEach((v, i) =>
              parts.push(
                `filters[variants][${key}][$in][${i}]=${encodeURIComponent(v)}`
              )
            );
          };
          if (appliedMaterials.length) pushIN("material", appliedMaterials);
          if (appliedSizes.length) pushIN("size", appliedSizes);
          if (appliedColors.length) pushIN("color", appliedColors);
        }

        // 关键：把需要显示的字段与 color_galleries（含 images）、variants.color 一起取回
        const qs =
          `/api/products?${parts.join("&")}` +
          `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
          `&fields[4]=discount_percent_off&fields[5]=sale_starts_at&fields[6]=sale_ends_at&fields[7]=hot_score&fields[8]=priority` +
          `&populate[color_galleries][fields][0]=color` +
          `&populate[color_galleries][populate][images]=true` +
          `&populate[variants][fields][0]=color` +
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
    productGenderSupported,
    appliedGenders.join(","), // 依赖 gender
    variantFiltersSupported,
    appliedMaterials.join(","),
    appliedSizes.join(","),
    appliedColors.join(","),
    sortQueryString, // 排序变化时重新拉取
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

  const resultLabel = `${filteredTotal} ${
    filteredTotal === 1 ? "result" : "results"
  }`;

  // 统一关闭抽屉（焦点回退）
  const closeDrawer = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  // 提交筛选（把草稿写入 URL，重置到第 1 页）
  const applyDraft = () => {
    const u = new URL(window.location.href);

    if (typeof draftMin === "number" && draftMin >= 0)
      u.searchParams.set("min", String(draftMin));
    else u.searchParams.delete("min");

    if (typeof draftMax === "number" && draftMax >= 0)
      u.searchParams.set("max", String(draftMax));
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
            <div className="text-sm md:text-base text-neutral-600 whitespace-nowrap">
              {resultLabel}
            </div>

            {/* Sort */}
            <div className="hidden sm:flex">
              <Select
                value={sortKey}
                onValueChange={(v) => setSortInUrl(v as SortKey)}
              >
                <SelectTrigger
                  className="rounded-full w-[190px] border px-3 py-2 text-sm focus:ring-2 focus:ring-black/10"
                  aria-label="Sort products"
                >
                  <SelectValue placeholder="Sort">
                    {SORT_LABELS[sortKey] ?? "Sort"}
                  </SelectValue>
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

            <Button
              ref={triggerBtnRef}
              variant="outline"
              className="rounded-full px-5"
              onClick={() => setOpen(true)}
            >
              Filter
            </Button>
          </div>
        </div>
      </header>

      {/* === 左侧抽屉 === */}
      <div
        className={`fixed inset-0 z-50 transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* 背景遮罩 */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
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
            {/* Gender（Product 级） */}
            {productGenderSupported && facetGenders.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Gender
                </summary>
                <div className="mt-2 space-y-2">
                  {facetGenders.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Array.from(draftGenders).includes(v)}
                        onChange={(e) => {
                          const set = new Set(draftGenders);
                          e.currentTarget.checked ? set.add(v) : set.delete(v);
                          setDraftGenders(set);
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Size（Variant 级） */}
            {variantFiltersSupported && facetSizes.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Size
                </summary>
                <div className="mt-2 space-y-2">
                  {facetSizes.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Array.from(draftSizes).includes(v)}
                        onChange={(e) => {
                          const set = new Set(draftSizes);
                          e.currentTarget.checked ? set.add(v) : set.delete(v);
                          setDraftSizes(set);
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Colour（Variant 级：用于过滤） */}
            {variantFiltersSupported && facetColors.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Colour
                </summary>
                <div className="mt-2 space-y-2">
                  {facetColors.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Array.from(draftColors).includes(v)}
                        onChange={(e) => {
                          const set = new Set(draftColors);
                          e.currentTarget.checked ? set.add(v) : set.delete(v);
                          setDraftColors(set);
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Material（Variant 级） */}
            {variantFiltersSupported && facetMaterials.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Material
                </summary>
                <div className="mt-2 space-y-2">
                  {facetMaterials.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Array.from(draftMaterials).includes(v)}
                        onChange={(e) => {
                          const set = new Set(draftMaterials);
                          e.currentTarget.checked ? set.add(v) : set.delete(v);
                          setDraftMaterials(set);
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Price */}
            <details className="mb-2" open>
              <summary className="cursor-pointer select-none py-2 font-medium">
                Price
              </summary>
              <div className="mt-2 flex items-end gap-3">
                <div className="flex-1">
                  <div className="text-xs text-neutral-500 mb-1">Min</div>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Min"
                    value={draftMin ?? ""}
                    onChange={(e) =>
                      setDraftMin(
                        e.currentTarget.value === ""
                          ? undefined
                          : Math.max(0, Number(e.currentTarget.value))
                      )
                    }
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-neutral-500 mb-1">Max</div>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Max"
                    value={draftMax ?? ""}
                    onChange={(e) =>
                      setDraftMax(
                        e.currentTarget.value === ""
                          ? undefined
                          : Math.max(0, Number(e.currentTarget.value))
                      )
                    }
                  />
                </div>
              </div>
            </details>
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
            {Array.from({
              length: Math.min(pageSize, filteredTotal - start) || 8,
            }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : list.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No products yet.
        </div>
      ) : (
        <section>
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {list.map((p, idx) => (
              <ProductCard key={p.key} p={p} idx={idx} start={start} />
            ))}
          </div>
        </section>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefForPage={hrefForPage}
        className="mb-10"
      />
    </>
  );
}
