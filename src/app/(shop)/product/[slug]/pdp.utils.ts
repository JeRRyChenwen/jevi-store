// src/app/(shop)/product/[slug]/pdp.utils.ts

import { mediaUrl } from "@/lib/strapi";
import { normalizeColorName } from "@/lib/colors";
import { type PriceRec } from "@/lib/pricing";

export function normalizeColor(s: any) {
  return normalizeColorName(s);
}

export function getImagesByColorFromProduct(attrs: any): Record<string, string[]> {
  const arr: any[] = Array.isArray(attrs?.color_galleries)
    ? attrs.color_galleries
    : Array.isArray(attrs?.color_galleries?.data)
      ? attrs.color_galleries.data
      : [];

  const out: Record<string, string[]> = {};

  for (const cg of arr) {
    const colorRaw = (cg?.color ?? cg?.attributes?.color) as string | undefined;
    const color = normalizeColor(colorRaw);
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

    if (!(color in out)) out[color] = urls;
    else if (urls.length) out[color] = urls;
  }

  return out;
}

export type VariantMeta = {
  sku: string | null;
  color: string;
  size: string;
  height: number;
};

export function getVariantMetaList(attrs: any): VariantMeta[] {
  const arr: any[] = Array.isArray(attrs?.variants?.data)
    ? attrs.variants.data
    : Array.isArray(attrs?.variants)
      ? attrs.variants
      : [];

  const out: VariantMeta[] = [];

  for (const v of arr) {
    const a = v?.attributes ?? v ?? {};
    const color = normalizeColor(a.color ?? "");
    const size = String(a.size ?? "").trim();
    if (!color || !size) continue;

    const h = Number(a.height_increase_cm);
    const height = Number.isFinite(h) ? h : 0;

    const sku = typeof a.sku === "string" && a.sku.trim() ? a.sku.trim() : null;

    out.push({ sku, color, size, height });
  }

  return out;
}

export function getStockByColorSizeHeightFromD1(
  variants: VariantMeta[],
  stockBySku: Record<string, number>
): {
  stock3: Record<string, Record<string, Record<number, number>>>;
  sku3: Record<string, Record<string, Record<number, string | null>>>;
  sizesSum: Record<string, Record<string, number>>;
  heightSum: Record<string, Record<number, number>>;
  colorSum: Record<string, number>;
} {
  const stock3: Record<string, Record<string, Record<number, number>>> = {};
  const sku3: Record<string, Record<string, Record<number, string | null>>> = {};
  const sizesSum: Record<string, Record<string, number>> = {};
  const heightSum: Record<string, Record<number, number>> = {};
  const colorSum: Record<string, number> = {};

  for (const v of variants) {
    const color = v.color;
    const size = v.size;
    const height = v.height;

    const sku = v.sku;
    const stock =
      sku && Object.prototype.hasOwnProperty.call(stockBySku, sku)
        ? Number(stockBySku[sku] ?? 0) || 0
        : 0;

    stock3[color] ??= {};
    stock3[color][size] ??= {};
    stock3[color][size][height] = (stock3[color][size][height] ?? 0) + stock;

    sku3[color] ??= {};
    sku3[color][size] ??= {};
    if (sku3[color][size][height] == null) {
      sku3[color][size][height] = sku;
    }

    sizesSum[color] ??= {};
    sizesSum[color][size] = (sizesSum[color][size] ?? 0) + stock;

    heightSum[color] ??= {};
    heightSum[color][height] = (heightSum[color][height] ?? 0) + stock;

    colorSum[color] = (colorSum[color] ?? 0) + stock;
  }

  return { stock3, sku3, sizesSum, heightSum, colorSum };
}

export function formatPriceVal(n: number | null, currency?: string | null, locale?: string) {
  if (n == null) return "—";
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function getPrices(attrs: any): PriceRec[] {
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

    const amountMinorNum = Number(a.amount_minor);
    const priceNum = Number(a.price);
    const realNum = Number((a as any).real_price);

    out.push({
      currency,
      amount_minor: Number.isFinite(amountMinorNum) ? Math.round(amountMinorNum) : undefined,
      price: Number.isFinite(priceNum) ? Math.round(priceNum) : undefined,
      real_price: Number.isFinite(realNum) ? Math.round(realNum) : undefined,
      discount: a.discount ?? undefined,
      discount_percent_off: a.discount_percent_off ?? undefined,
      sale_starts_at: a.sale_starts_at ?? undefined,
      sale_ends_at: a.sale_ends_at ?? undefined,
    } as PriceRec);
  }

  return out;
}

export function extractCategory(
  attrs: any
): { slug?: string; label?: string; parentSlug?: string; parentLabel?: string } | null {
  const raw = attrs?.category;
  if (!raw) return null;

  const a = raw?.data?.attributes ?? raw?.attributes ?? raw?.data ?? raw;

  const slug = typeof a?.slug === "string" ? a.slug : undefined;
  const label =
    (typeof a?.title === "string" && a.title) ||
    (typeof a?.name === "string" && a.name) ||
    undefined;

  const pRaw = a?.parent;
  const p = pRaw?.data?.attributes ?? pRaw?.attributes ?? pRaw?.data ?? pRaw;

  const parentSlug = typeof p?.slug === "string" ? p.slug : undefined;
  const parentLabel =
    (typeof p?.title === "string" && p.title) ||
    (typeof p?.name === "string" && p.name) ||
    undefined;

  if (!slug && !label && !parentSlug && !parentLabel) return null;

  return {
    slug,
    label: label ?? slug,
    parentSlug,
    parentLabel: parentLabel ?? parentSlug,
  };
}