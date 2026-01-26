import { mediaUrl } from "@/lib/strapi";
import { normalizeColorName } from "@/lib/colors";
import * as SP from "@/lib/strapiPrice";

export type PriceRec = any;

export type ProductLite = {
  key: string;
  slug?: string;
  name: string;

  prices: PriceRec[];

  price: number | null;
  currency?: string | null;

  discountPercent?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  hotScore?: number | null;

  colors?: string[];
  sizes?: string[];

  variantsByColor: Record<string, string[]>;
  imageUrl?: string;
};

export type PickRes =
  | { base_minor: number | null; effective_minor: number | null; currency: string }
  | null;

// ---------- size helpers ----------
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

export function sortSizes(arr: string[]) {
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

export function getVariantSizes(attrs: any): string[] {
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

export function getVariantColors(attrs: any): string[] {
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

export function getImagesByColorFromProduct(attrs: any): Record<string, string[]> {
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
    const discountNum = Number(a.discount);
    const dpoNum = Number(a.discount_percent_off);

    out.push({
      currency,
      amount_minor: Number.isFinite(amountMinorNum) ? Math.round(amountMinorNum) : undefined,
      price: Number.isFinite(priceNum) ? priceNum : undefined,
      discount: Number.isFinite(discountNum) ? discountNum : undefined,
      discount_percent_off: Number.isFinite(dpoNum) ? dpoNum : undefined,
      sale_starts_at: a.sale_starts_at ?? undefined,
      sale_ends_at: a.sale_ends_at ?? undefined,
    } as PriceRec);
  }
  return out;
}

// ---------- pricing / sale helpers ----------
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

export function isSaleActiveByLegacy(p: ProductLite) {
  const pct = p.discountPercent ?? 0;
  if (!pct || pct <= 0) return false;
  const now = Date.now();
  const s = p.saleStartsAt ? Date.parse(p.saleStartsAt) : Number.NaN;
  const e = p.saleEndsAt ? Date.parse(p.saleEndsAt) : Number.NaN;
  const started = Number.isNaN(s) ? true : now >= s;
  const notEnded = Number.isNaN(e) ? true : now <= e;
  return started && notEnded;
}

export function salePriceLegacy(p: ProductLite) {
  const base = p.price ?? 0;
  const pct = p.discountPercent ?? 0;
  return Math.max(0, base * (1 - pct / 100));
}

/** 兜底：按币种挑选并计算价格（minor） */
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

  if (inWindow(rec.sale_starts_at, rec.sale_ends_at)) {
    const d = Number(rec.discount);
    const off = Number(rec.discount_percent_off);

    if (Number.isFinite(d) && d > 0 && d <= 100) {
      effective_minor = Math.max(0, Math.round(base_minor * (d / 100)));
    } else if (Number.isFinite(off) && off > 0 && off < 100) {
      effective_minor = Math.max(0, Math.round(base_minor * (1 - off / 100)));
    }
  }

  return { base_minor, effective_minor, currency: code };
}

/**
 * 适配器：
 * - 若存在 SP.pickPriceForCurrency（返回 baseMajor/effectiveMajor），先用它
 * - 把 major 转成 minor
 * - 若库函数没产生折扣（effective==base），再用兜底规则重算一次折扣
 * - 否则直接退回兜底
 */
export const pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes = (prices, currency) => {
  const ccy = String(currency || "AUD").toUpperCase();
  const libPick = (SP as any)?.pickPriceForCurrency;

  if (typeof libPick === "function") {
    try {
      const r = libPick(prices, ccy);
      if (r) {
        const baseMinor =
          Number.isFinite(Number(r.baseMajor)) ? Math.round(Number(r.baseMajor) * 100) : null;
        let effMinor =
          Number.isFinite(Number(r.effectiveMajor)) ? Math.round(Number(r.effectiveMajor) * 100) : baseMinor;
        const outCcy = String(r.currency || ccy).toUpperCase();

        if (baseMinor != null && effMinor === baseMinor) {
          const fb = _fallbackPickPriceForCurrency(prices, outCcy);
          if (
            fb &&
            typeof fb.base_minor === "number" &&
            typeof fb.effective_minor === "number" &&
            fb.effective_minor < fb.base_minor
          ) {
            return fb;
          }
        }
        return { base_minor: baseMinor, effective_minor: effMinor, currency: outCcy };
      }
    } catch {
      // ignore
    }
  }

  return _fallbackPickPriceForCurrency(prices, ccy);
};

// ★ 卡片专用价格格式：AUD -> "AUD $425.00"
export function formatPriceForCard(minor: number, currency: string) {
  const code = String(currency || "AUD").toUpperCase();
  const major = (minor || 0) / 100;
  const numStr = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);

  if (code === "AUD") return `AUD $${numStr}`;
  return `${code} ${numStr}`;
}

// ---------- mapper ----------
export function normalizeProduct(row: any): ProductLite {
  const attrs = row?.attributes ?? row ?? {};
  const name: string = attrs.title ?? attrs.name ?? attrs.slug ?? "Product";

  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? Math.max(0, cents) / 100 : null;
  const currency: string | undefined = (attrs.currency ?? "AUD") as string;

  const prices = getPrices(attrs);

  const variantsByColor = getImagesByColorFromProduct(attrs);

  const set = new Set<string>(Object.keys(variantsByColor));
  for (const c of getVariantColors(attrs)) set.add(c);
  const colors = Array.from(set);

  const sizes = getVariantSizes(attrs);

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
