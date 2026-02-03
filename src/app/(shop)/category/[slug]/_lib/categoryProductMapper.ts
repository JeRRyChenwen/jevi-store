import { mediaUrl } from "@/lib/strapi";
import { normalizeColorName } from "@/lib/colors";

// ⚠️ 旧的 strapiPrice 里可能仍以 major 逻辑工作，现阶段不要再依赖它做换算
// import * as SP from "@/lib/strapiPrice";

export type PriceRec = any;

export type ProductLite = {
  key: string;
  slug?: string;
  name: string;

  prices: PriceRec[];

  /** 兼容字段：用于旧 UI/旧逻辑展示（现在从 prices 推导） */
  price: number | null; // major（用于旧 UI 展示）
  currency?: string | null;

  /** 兼容字段：用于旧 sale 逻辑（现在从 prices 推导） */
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

/**
 * ✅ 读取 Product.prices component（Strapi）
 * 你现在的新约定：
 * - price / real_price 都是 integer minor（分）
 * - amount_minor（旧字段）可以继续兼容读取
 * - 不再使用 discount / sale window 来“计算最终价”
 */
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

    // ✅ 新字段：minor（integer）
    const priceNum = Number(a.price);
    const realNum = Number(a.real_price);

    // 🔁 兼容旧字段（如果你历史上存在 amount_minor）
    const amountMinorNum = Number(a.amount_minor);

    out.push({
      currency,

      // 旧兼容字段
      amount_minor: Number.isFinite(amountMinorNum) ? Math.round(amountMinorNum) : undefined,

      // ✅ 现在这两个都视为 minor（分），不再 major 化
      price: Number.isFinite(priceNum) ? Math.round(priceNum) : undefined,
      real_price: Number.isFinite(realNum) ? Math.round(realNum) : undefined,

      // 下面这些字段先保留读取，但不会再用于“算最终价”
      discount: a.discount ?? undefined,
      discount_percent_off: a.discount_percent_off ?? undefined,
      sale_starts_at: a.sale_starts_at ?? undefined,
      sale_ends_at: a.sale_ends_at ?? undefined,
    } as PriceRec);
  }
  return out;
}

// ---------- pricing / sale helpers ----------

/**
 * 这个函数在你项目里用于“展示”，但你现在传进来的 n 有时是 major、有时是 minor，
 * 继续保留它（避免大范围改动），但建议以后只在“major 值”上用它。
 */
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

/**
 * ✅ Legacy sale 判断改为：原价（price） > 现价（real_price）
 * 这样不用任何 discount 字段，也不会依赖 sale window。
 */
export function isSaleActiveByLegacy(p: ProductLite) {
  const prices = Array.isArray(p?.prices) ? p.prices : [];
  const picked = _fallbackPickPriceForCurrency(prices, String(p.currency || "AUD"));
  if (!picked) return false;
  const base = typeof picked.base_minor === "number" ? picked.base_minor : 0;
  const eff = typeof picked.effective_minor === "number" ? picked.effective_minor : 0;
  return base > 0 && eff > 0 && eff < base;
}

/**
 * ✅ Legacy “sale price” 改为直接返回当前价（major）
 * 这里 p.price 是 major（用于旧 UI），所以返回也用 major。
 */
export function salePriceLegacy(p: ProductLite) {
  // p.price 现在被我们改成“现价 major”（见 deriveLegacyFieldsFromPrices）
  return Math.max(0, Number(p.price ?? 0));
}

/** 兜底：按币种挑选并计算价格（minor） */
function _fallbackPickPriceForCurrency(prices: PriceRec[], currency: string): PickRes {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const code = String(currency || "AUD").toUpperCase();

  const rec: any =
    prices.find((r: any) => String(r?.currency || "").toUpperCase() === code) ||
    prices[0] ||
    null;
  if (!rec) return null;

  // ✅ base_minor：优先 price（原价，minor），其次 amount_minor（旧字段）
  const baseFromPrice = toMinorInt(rec.price);
  const baseFromAmount = toMinorInt(rec.amount_minor);

  const base_minor =
    baseFromPrice > 0 ? baseFromPrice : baseFromAmount > 0 ? baseFromAmount : null;

  // ✅ effective_minor：优先 real_price（现价，minor），否则退回 base
  const effFromReal = toMinorInt(rec.real_price);
  const effective_minor = effFromReal > 0 ? effFromReal : base_minor;

  return { base_minor, effective_minor, currency: code };
}

/**
 * ⚠️ 以前这里会尝试调用 lib 的 pick（它可能按 major 处理），再 *100 转 minor。
 * 你现在已经全面切换到 “Strapi 存 minor”，继续用它很容易造成二次换算。
 *
 * ✅ 现在直接使用我们的 fallback（只做 minor 读取、不做猜测）。
 */
export const pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes = (
  prices,
  currency
) => {
  const ccy = String(currency || "AUD").toUpperCase();
  return _fallbackPickPriceForCurrency(prices, ccy);
};

// ★ 卡片专用价格格式：AUD -> "AUD $425.00"
export function formatPriceForCard(minor: number, currency: string) {
  const code = String(currency || "AUD").toUpperCase();

  // ✅ minor -> major 展示
  const major = (toMinorInt(minor) || 0) / 100;

  const numStr = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);

  if (code === "AUD") return `AUD $${numStr}`;
  return `${code} ${numStr}`;
}

/**
 * ✅ 从 prices 推导一个“默认展示用”的 price/currency/discount/window（优先 AUD）
 *
 * 重要变化：
 * - 以前 priceMajor 用 baseMinor/100（baseMinor 是“基础价”）
 * - 现在为了配合你“直接展示 real_price（现价）”，我们让 priceMajor = effectiveMinor/100
 *   这样旧 UI 如果只展示 p.price，会显示“现价”（符合你目标）
 *
 * - discountPercent 不再从 discount 字段推导；改为由 price vs real_price 推导
 *   如果 base > eff，则 percent_off = round((1 - eff/base) * 100)
 */
function deriveLegacyFieldsFromPrices(
  prices: PriceRec[],
  preferredCurrency = "AUD"
): {
  priceMajor: number | null;
  currency: string;
  discountPercent?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
} {
  const picked = _fallbackPickPriceForCurrency(prices, preferredCurrency);
  const ccy = picked?.currency ?? String(preferredCurrency || "AUD").toUpperCase();

  const baseMinor = picked && typeof picked.base_minor === "number" ? picked.base_minor : null;
  const effMinor =
    picked && typeof picked.effective_minor === "number" ? picked.effective_minor : null;

  // ✅ 让 legacy price 显示“现价”（real_price）
  const priceMajor = effMinor != null ? effMinor / 100 : null;

  // 取对应币种的 rec，便于推导 discountPercent（不再依赖 discount 字段）
  const rec: any =
    prices.find((r: any) => String(r?.currency || "").toUpperCase() === ccy) ||
    prices[0] ||
    null;

  // ✅ discountPercent 推导：由 base/eff 自动算
  let discountPercent: number | undefined = undefined;
  if (
    typeof baseMinor === "number" &&
    typeof effMinor === "number" &&
    baseMinor > 0 &&
    effMinor > 0 &&
    effMinor < baseMinor
  ) {
    discountPercent = Math.round((1 - effMinor / baseMinor) * 100);
    if (typeof discountPercent === "number" && discountPercent <= 0) discountPercent = undefined;

    if (typeof discountPercent === "number" && discountPercent >= 100) discountPercent = 99;

  }

  // 促销时间窗字段保留（但不用于计算）
  const normDateStr = (v: any): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s ? s : null;
  };

  const saleStartsAt = normDateStr(rec?.sale_starts_at);
  const saleEndsAt = normDateStr(rec?.sale_ends_at);

  return { priceMajor, currency: ccy, discountPercent, saleStartsAt, saleEndsAt };
}

// ---------- mapper ----------
export function normalizeProduct(row: any): ProductLite {
  const attrs = row?.attributes ?? row ?? {};
  const name: string = attrs.title ?? attrs.name ?? attrs.slug ?? "Product";

  const prices = getPrices(attrs);
  const derived = deriveLegacyFieldsFromPrices(prices, "AUD");

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

  return {
    key,
    slug: attrs.slug,
    name,
    prices,

    // ✅ legacy: 这里的 price 现在是“现价 major”（来自 real_price）
    price: derived.priceMajor,
    currency: derived.currency,

    // ✅ legacy: 用 base vs real 自动推导出来的 percent（用于旧 UI badge）
    discountPercent: derived.discountPercent,
    saleStartsAt: derived.saleStartsAt,
    saleEndsAt: derived.saleEndsAt,

    hotScore: typeof attrs.hot_score === "number" ? attrs.hot_score : null,
    colors,
    sizes,
    variantsByColor,
    imageUrl,
  };
}

// ------- local helper -------
function toMinorInt(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}
