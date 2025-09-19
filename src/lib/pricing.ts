// src/lib/pricing.ts
// 通用：前端/后端都可用的纯函数

export type Currency = "AUD" | "USD" | "EUR" | "GBP" | "CAD";

/**
 * 单条价格记录：最小货币单位（如 12.34 -> 1234）
 * - amount_minor：基础价（必填）
 * - sale_amount_minor：促销价（可选）
 * - discount_percent_off：折扣百分比（0..100，可选，作为兜底）
 * - sale_starts_at / sale_ends_at：促销时间窗（可选）
 */
export type PriceRec = {
  currency: Currency;
  amount_minor: number;                 // 基础价（最小货币单位整数）
  sale_amount_minor?: number | null;    // 促销价（最小货币单位）
  discount_percent_off?: number | null; // 0..100，可选
  sale_starts_at?: string | null;       // ISO 字符串，可选
  sale_ends_at?: string | null;         // ISO 字符串，可选
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
  const base = Math.max(0, p.amount_minor || 0);
  const cand: number[] = [base];

  if (typeof p.sale_amount_minor === "number") cand.push(Math.max(0, p.sale_amount_minor));
  if (typeof p.discount_percent_off === "number") {
    const pct = Math.min(100, Math.max(0, p.discount_percent_off));
    cand.push(Math.max(0, Math.round(base * (100 - pct) / 100)));
  }
  return Math.min(...cand) < base;
}

/** 计算当前“生效价”（最小货币单位整数） */
export function effectiveMinor(p: PriceRec, now = new Date()): number {
  const base = Math.max(0, p.amount_minor || 0);
  if (!isSaleWindowActive(p, now)) return base;

  const candidates: number[] = [base];

  if (typeof p.sale_amount_minor === "number") {
    candidates.push(Math.max(0, p.sale_amount_minor));
  }
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
