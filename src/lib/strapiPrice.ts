// src/lib/strapiPrice.ts
export type StrapiPrice = {
  currency: string;   // "AUD" | "USD" ...
  price: number;      // 现在按“元”存：500 => 显示 500.00
  // 新字段（你准备启用）
  discount?: number | null;              // 85 => 按原价 85% 售卖
  // 兼容旧字段
  discount_percent_off?: number | null;  // 24 => 减 24%
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

export type PriceCalc = {
  currency: string;
  baseMajor: number;      // 原价（按元）
  effectiveMajor: number; // 生效价（按元）
  // 用于前端展示的小标签，例如 "85%" 或 "24% OFF"
  badge?: string | null;
};

function inSaleWindow(start?: string | null, end?: string | null) {
  if (!start && !end) return true; // 没设置窗口就默认有效
  const now = Date.now();
  const s = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
  const e = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;
  return now >= s && now <= e;
}

/** 传入一个价格条目（某币种），返回计算结果 */
export function calcPrice(p: StrapiPrice): PriceCalc {
  const currency = (p.currency || "AUD").toUpperCase();
  const baseMajor = Math.max(0, Number(p.price) || 0);

  let effective = baseMajor;
  let badge: string | null = null;

  const windowOK = inSaleWindow(p.sale_starts_at ?? null, p.sale_ends_at ?? null);

  if (windowOK) {
    // 新语义：discount=85 表示按 85% 售卖
    if (p.discount != null && !Number.isNaN(Number(p.discount))) {
      const d = Math.min(100, Math.max(1, Number(p.discount)));
      effective = +(baseMajor * (d / 100)).toFixed(2);
      badge = `${d}%`;
    } else if (p.discount_percent_off != null && !Number.isNaN(Number(p.discount_percent_off))) {
      // 兼容旧字段：24% OFF
      const off = Math.min(100, Math.max(0, Number(p.discount_percent_off)));
      effective = +(baseMajor * (1 - off / 100)).toFixed(2);
      badge = `${off}% OFF`;
    }
  }

  return { currency, baseMajor, effectiveMajor: effective, badge };
}

/** 从 prices[] 里挑一个币种，算出展示用价格 */
export function pickPriceForCurrency(prices: StrapiPrice[] | null | undefined, want = "AUD"): PriceCalc {
  const list = Array.isArray(prices) ? prices : [];
  const hit = list.find(p => String(p.currency).toUpperCase() === String(want).toUpperCase());
  // 没命中就回退第一条
  const chosen = hit || list[0] || { currency: want, price: 0 };
  return calcPrice(chosen as StrapiPrice);
}
