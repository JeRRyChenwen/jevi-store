// src/lib/pricing.ts
// 通用：前端/后端都可用的纯函数

export type Currency = "AUD" | "USD" | "EUR" | "GBP" | "CAD";

/**
 * 单条价格记录（最小货币单位整数，例如 12.34 -> 1234）
 *
 * ✅ 推荐字段（明确是 minor）：
 *   - price_minor         基础价（minor）
 *   - sale_price_minor    促销价（minor，可选）
 *
 * 🔁 兼容字段（老代码仍可写入/读取）：
 *   - price               （历史遗留：有的地方当 minor，有的地方当 major；不推荐继续使用）
 *   - amount_minor        == price_minor
 *   - sale_amount_minor   == sale_price_minor
 *
 * 其他：
 *   - discount_percent_off  折扣百分比（0..100，可选）
 *   - sale_starts_at / sale_ends_at  促销时间窗（可选）
 */
export type PriceRec = {
  currency: Currency;

  // ✅ 推荐：明确 minor
  price_minor?: number | null;
  sale_price_minor?: number | null;

  // 🔁 兼容旧字段
  price?: number | null; // ⚠️ 不推荐（可能被当成 major）
  amount_minor?: number | null;
  sale_amount_minor?: number | null;

  /**
   * ✅ 你项目当前实际使用的“真正成交价 / 折后价”（minor）
   * 例如：
   * - 原价 99.00  -> price / amount_minor = 9900
   * - 折后 84.15 -> real_price = 8415
   */
  real_price?: number | null;

  discount_percent_off?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

const DECIMALS: Record<string, number> = {
  AUD: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
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

function clampMinor(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** 基础价（minor） */
function baseMinor(p: PriceRec): number {
  // ✅ 优先读明确字段
  if (p.price_minor != null) return clampMinor(p.price_minor);
  if (p.amount_minor != null) return clampMinor(p.amount_minor);

  // ⚠️ 再兼容旧字段 price（历史上可能有人当 major 填入）
  // 这里“只做兼容读取”，不做 *100 猜测，否则会更乱。
  if (p.price != null) return clampMinor(p.price);

  return 0;
}

/** 促销价（minor） */
function saleMinor(p: PriceRec): number | undefined {
  const raw = p.sale_price_minor ?? p.sale_amount_minor;
  if (raw == null) return undefined;
  return clampMinor(raw);
}

/** 促销候选价（兼容你项目里的 real_price） */
function realMinor(p: PriceRec): number | undefined {
  if (p.real_price == null) return undefined;
  return clampMinor(p.real_price);
}

/** 仅判断“是否在促销时间窗内”（忽略有没有促销价/折扣） */
export function isSaleWindowActive(p: PriceRec, now = new Date()): boolean {
  const s = p.sale_starts_at ? Date.parse(p.sale_starts_at) : NaN;
  const e = p.sale_ends_at ? Date.parse(p.sale_ends_at) : NaN;
  const t = now.getTime();
  const started = Number.isNaN(s) || t >= s;
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

  const rm = realMinor(p);
  if (typeof rm === "number") cand.push(rm);

  if (typeof p.discount_percent_off === "number") {
    const pct = Math.min(100, Math.max(0, p.discount_percent_off));
    cand.push(Math.max(0, Math.round((base * (100 - pct)) / 100)));
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

  const rm = realMinor(p);
  if (typeof rm === "number") candidates.push(rm);

  if (typeof p.discount_percent_off === "number") {
    const pct = Math.min(100, Math.max(0, p.discount_percent_off));
    candidates.push(Math.max(0, Math.round((base * (100 - pct)) / 100)));
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
    DE: "EUR",
    FR: "EUR",
    ES: "EUR",
    IT: "EUR",
    NL: "EUR",
    IE: "EUR",
  };
  const byCountry = byCountryMap[upper(userCountry)];
  if (byCountry && available.includes(byCountry)) return byCountry;

  return available.includes(fallback) ? fallback : available[0];
}

/* ================= Step A: 展示层统一入口（新增） ================= */

/** ✅ 统一：把任何输入安全转成 “非负整数 minor” */
export function toMinorInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * ✅ 统一：minor -> 带货币符号的金额展示（推荐全站只用这个）
 * - 8400 + AUD -> "A$84.00"
 * - 3000 + USD -> "$30.00"
 */
export function formatMoneyFromMinor(
  minor: number | null | undefined,
  currency: Currency,
  opts?: { showCode?: boolean }
): string {
  const amountMinor = toMinorInt(minor ?? 0);
  const amountMajor = amountMinor / 10 ** (DECIMALS[currency] ?? 2);

  // 用 Intl.NumberFormat 处理本地化 & 货币符号
  const nf = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: opts?.showCode ? "code" : "symbol",
    minimumFractionDigits: DECIMALS[currency] ?? 2,
    maximumFractionDigits: DECIMALS[currency] ?? 2,
  });

  return nf.format(amountMajor);
}

/**
 * ✅ 统一：给你一个“简单格式化”别名，方便替换旧代码
 *（如果你更喜欢 AUD 84.00 而不是 A$84.00，可以告诉我，我帮你改输出格式）
 */
export function formatMoneySmart(minor: number | null | undefined, currency: Currency): string {
  return formatMoneyFromMinor(minor, currency);
}


/* ================= Step B: MARKET 驱动的价格选择入口（新增） ================= */

export type DisplayPrice = {
  currency: Currency;
  record: PriceRec | null;
  baseMinor: number | null;
  effectiveMinor: number | null;
  saleActive: boolean;
  discountPercent: number;
};

/**
 * ✅ 根据 MARKET 默认货币选择“首选币种”
 * 说明：
 * - AU_NZ -> AUD
 * - EU    -> EUR
 * - US_CA -> USD
 *
 * 后续如果你想升级成：
 * - US_CA + country=CA -> CAD
 * 可以在这里继续扩展，不需要改调用方。
 */
export function pickCurrencyForMarket(
  available: Currency[],
  preferredCurrency: Currency
): Currency {
  return pickCurrency(available, { fallback: preferredCurrency });
}

/**
 * ✅ 从价格数组中找出“当前应显示的那条记录”
 */
export function pickPriceRecordByCurrency(
  prices: PriceRec[],
  currency: Currency
): PriceRec | null {
  const rec =
    prices.find(
      (p) => String(p.currency || "").toUpperCase() === String(currency).toUpperCase()
    ) ?? null;

  return rec;
}

/**
 * ✅ 统一：根据首选币种，输出展示层所需的完整价格结果
 * - 负责选币种
 * - 负责找 price record
 * - 负责算基础价 / 生效价 / sale 状态 / discount
 */
export function resolveDisplayPrice(
  prices: PriceRec[],
  preferredCurrency: Currency
): DisplayPrice {
  const available = prices
    .map((p) => String(p.currency || "").toUpperCase())
    .filter(Boolean) as Currency[];

  if (!available.length) {
    return {
      currency: preferredCurrency,
      record: null,
      baseMinor: null,
      effectiveMinor: null,
      saleActive: false,
      discountPercent: 0,
    };
  }

  const currency = pickCurrencyForMarket(available, preferredCurrency);
  const record = pickPriceRecordByCurrency(prices, currency);

  if (!record) {
    return {
      currency,
      record: null,
      baseMinor: null,
      effectiveMinor: null,
      saleActive: false,
      discountPercent: 0,
    };
  }

  const base = baseMinor(record);
  const effective = effectiveMinor(record);
  const sale = isSaleActive(record);

  const discountPercent =
    sale && base > 0 && effective >= 0 && effective < base
      ? Math.round((1 - effective / base) * 100)
      : 0;

  return {
    currency,
    record,
    baseMinor: base,
    effectiveMinor: effective,
    saleActive: sale,
    discountPercent,
  };
}