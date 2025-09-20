// src/lib/pricing.ts
// 通用：前端/后端都可用的纯函数

export type Currency = "AUD" | "USD" | "EUR" | "GBP" | "CAD";

/**
 * 单条价格记录（最小货币单位整数，例如 12.34 -> 1234）
 *
 * ✅ 新字段（推荐）：
 *   - price              基础价
 *   - sale_price_minor   促销价
 *
 * 🔁 兼容别名（老代码仍可写入/读取）：
 *   - amount_minor       == price
 *   - sale_amount_minor  == sale_price_minor
 *
 * 其他：
 *   - discount_percent_off  折扣百分比（0..100，可选）
 *   - sale_starts_at / sale_ends_at  促销时间窗（可选）
 */
export type PriceRec = {
  currency: Currency;

  // 新字段（推荐）
  price?: number;
  sale_price_minor?: number | null;

  // 兼容旧字段（允许出现在对象字面量里，避免 TS 报“多余属性”）
  amount_minor?: number | null;
  sale_amount_minor?: number | null;

  discount_percent_off?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

const DECIMALS: Record<string, number> = {
  AUD: 2, USD: 2, EUR: 2, GBP: 2, CAD: 2,
};

/** 主货币 -> 最小单位（"12.34" -> 1234） */
export function majorToMinor(amount: string | number, currency: Currency): number {
  const d = DECIMALS[currency] ?? 2;
  const n = typeof amount === "number" ? amount : Number(amount);
  return Math.round(n * 10 ** d);
}

/** 最小单位 -> 主货币字符串（1234 -> "12.34"） */
export function minorToMajor(minor: number, currency: Currency): string {
  const d = DECIMALS[currency] ?? 2;
  return (minor / 10 ** d).toFixed(d);
}

/* ---------------- internal helpers（统一读取新旧字段） ---------------- */
function baseMinor(p: PriceRec): number {
  const v = p.price ?? (p.amount_minor ?? 0);
  return Math.max(0, Number(v) || 0);
}
function saleMinor(p: PriceRec): number | undefined {
  const raw = (p.sale_price_minor ?? p.sale_amount_minor);
  if (typeof raw !== "number") return undefined;
  return Math.max(0, raw);
}

/** 仅判断“是否在促销时间窗内”（忽略有没有促销价/折扣） */
export function isSaleWindowActive(p: PriceRec, now = new Date()): boolean {
  const s = p.sale_starts_at ? Date.parse(p.sale_starts_at) : NaN;
  const e = p.sale_ends_at ? Date.parse(p.sale_ends_at) : NaN;
  const t = now.getTime();
  const started  = Number.isNaN(s) || t >= s;
  const notEnded = Number.isNaN(e) || t <= e;
  return started && notEnded;
}

/** 该记录是否“有效促销”（既在时间窗内，又存在比基础价更低的候选价） */
export function isSaleActive(p: PriceRec, now = new Date()): boolean {
  if (!isSaleWindowActive(p, now)) return false;
  const base = baseMinor(p);
  const cand: number[] = [base];

  const sm = saleMinor(p);
  if (typeof sm === "number") cand.push(sm);

  if (typeof p.discount_percent_off === "number") {
    const pct = Math.min(100, Math.max(0, p.discount_percent_off));
    cand.push(Math.max(0, Math.round(base * (100 - pct) / 100)));
  }
  return Math.min(...cand) < base;
}

/** 计算当前“生效价”（最小货币单位整数） */
export function effectiveMinor(p: PriceRec, now = new Date()): number {
  const base = baseMinor(p);
  if (!isSaleWindowActive(p, now)) return base;

  const candidates: number[] = [base];

  const sm = saleMinor(p);
  if (typeof sm === "number") candidates.push(sm);

  if (typeof p.discount_percent_off === "number") {
    const pct = Math.min(100, Math.max(0, p.discount_percent_off));
    candidates.push(Math.max(0, Math.round(base * (100 - pct) / 100)));
  }
  return Math.min(...candidates);
}

/** 从可用币种里挑一个（用户币种/国家优先，找不到就用 fallback） */
export function pickCurrency(
  available: Currency[],
  opts?: { userCurrency?: string | null; userCountry?: string | null; fallback?: Currency }
): Currency {
  const { userCurrency, userCountry, fallback = "AUD" } = opts || {};
  const upper = (s?: string | null) => (s || "").toUpperCase();

  const want = upper(userCurrency) as Currency;
  if (available.includes(want)) return want;

  const byCountryMap: Record<string, Currency> = {
    AU: "AUD",
    US: "USD",
    GB: "GBP",
    CA: "CAD",
    DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR",
  };
  const byCountry = byCountryMap[upper(userCountry)];
  if (byCountry && available.includes(byCountry)) return byCountry;

  return available.includes(fallback) ? fallback : available[0];
}
