// src/lib/strapiPrice.ts

export type StrapiPrice = {
  currency: string; // "AUD" | "USD" ...
  /**
   * 价格（按 major 存：500 => 500.00）
   * 注意：你的 Strapi 现在就是这样设计的，所以这里按 major 处理。
   */
  price: number;

  // 新字段（你准备启用）
  discount?: number | null; // 85 => 按原价 85% 售卖（打 85 折）

  // 兼容旧字段
  discount_percent_off?: number | null; // 24 => 减 24%
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

export type PriceCalc = {
  currency: string;

  // major（元）
  baseMajor: number;
  effectiveMajor: number;

  // ✅ 新增：minor（分），避免项目里到处 *100
  baseMinor: number;
  effectiveMinor: number;

  // 用于前端展示的小标签，例如 "85%" 或 "24% OFF"
  badge?: string | null;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function majorToMinor(major: number) {
  // 你现在所有币种都是 2 位小数的假设（AUD/USD/EUR/GBP/CAD 都是 2）
  return Math.max(0, Math.round(round2(major) * 100));
}

function inSaleWindow(start?: string | null, end?: string | null) {
  if (!start && !end) return true; // 没设置窗口就默认有效
  const now = Date.now();
  const s = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
  const e = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;
  return now >= s && now <= e;
}

/** 传入一个价格条目（某币种），返回计算结果（major + minor） */
export function calcPrice(p: StrapiPrice): PriceCalc {
  const currency = String(p?.currency || "").trim().toUpperCase() || "AUD";
  const baseMajor = Math.max(0, Number(p?.price) || 0);

  let effectiveMajor = baseMajor;
  let badge: string | null = null;

  const windowOK = inSaleWindow(p?.sale_starts_at ?? null, p?.sale_ends_at ?? null);

  if (windowOK) {
    // 新语义：discount=85 表示按 85% 售卖（打 85 折）
    if (p?.discount != null && Number.isFinite(Number(p.discount))) {
      const d = Math.min(100, Math.max(1, Number(p.discount)));
      effectiveMajor = round2(baseMajor * (d / 100));
      badge = `${d}%`;
    } else if (
      p?.discount_percent_off != null &&
      Number.isFinite(Number(p.discount_percent_off))
    ) {
      // 兼容旧字段：24% OFF
      const off = Math.min(100, Math.max(0, Number(p.discount_percent_off)));
      effectiveMajor = round2(baseMajor * (1 - off / 100));
      badge = `${off}% OFF`;
    }
  }

  const baseMinor = majorToMinor(baseMajor);
  const effectiveMinor = majorToMinor(effectiveMajor);

  return { currency, baseMajor, effectiveMajor, baseMinor, effectiveMinor, badge };
}

/**
 * 从 prices[] 里挑一个币种，算出展示用价格
 * - 默认 want="AUD"
 * - 找不到 want 就回退第一条
 * - 如果连第一条都没有，就用 {currency: want, price: 0}
 */
export function pickPriceForCurrency(
  prices: StrapiPrice[] | null | undefined,
  want?: string | null
): PriceCalc {
  const list = Array.isArray(prices) ? prices : [];
  const wantCcy = String(want || "").trim().toUpperCase();

  const hit = list.find(
    (p) => String(p?.currency || "").toUpperCase() === wantCcy
  );

  const chosen = hit || list[0] || { currency: wantCcy || "AUD", price: 0 };
  return calcPrice(chosen as StrapiPrice);
}
