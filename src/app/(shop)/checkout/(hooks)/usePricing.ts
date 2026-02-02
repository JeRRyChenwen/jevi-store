// src/app/checkout/(hooks)/usePricing.ts
"use client";

import { useMemo } from "react";
import { selectCurrencyAndTotals } from "@/lib/cartPricing";
import { effectiveMinor, type PriceRec, type Currency } from "@/lib/pricing";

/**
 * 把各种 price 形态统一成 minor（分）
 * - 优先 amount_minor
 * - 兼容 price 可能是 major（如 199.99）或 minor（如 19999）
 */
function toMinor(p: any): number {
  const a = Number(p?.amount_minor);
  if (Number.isFinite(a)) return Math.max(0, Math.round(a));

  const v = Number(p?.price);
  if (!Number.isFinite(v)) return 0;

  // 若是小数，几乎确定是 major
  if (!Number.isInteger(v)) return Math.max(0, Math.round(v * 100));

  // 整数时：通常是 minor；（如果你曾经存 major 的整数，也会被当成 minor——但这种情况很少）
  return Math.max(0, Math.round(v));
}

/**
 * 折扣字段兼容：
 * - discount_percent_off: 20 => -20%
 * - discount: 80 => 8折（等价 percent_off = 100 - 80）
 */
function normalizeDiscountFields(p: any): {
  discount_percent_off?: number;
  discount?: number;
} {
  const out: { discount_percent_off?: number; discount?: number } = {};

  const off = Number(p?.discount_percent_off);
  if (Number.isFinite(off) && off > 0 && off < 100) {
    out.discount_percent_off = off;
  }

  const d = Number(p?.discount);
  if (Number.isFinite(d) && d > 0 && d <= 100) {
    out.discount = d;
  }

  return out;
}

/**
 * 把商品条目转成定价记录数组（兼容 Strapi prices、多币种、折扣价）
 *
 * 约定：
 * - 返回的 PriceRec.amount_minor / price 都用 minor（分）
 * - currency 强制大写
 */
export function itemToPriceRecs(it: any): PriceRec[] {
  const rawPrices = it?.prices;

  // ✅ 1) 优先用 it.prices（来自 Strapi prices 组件 或你 cart 里保存的 prices）
  if (Array.isArray(rawPrices) && rawPrices.length) {
    const mapped = rawPrices
      .map((p: any) => {
        const currency = String(p?.currency || "").toUpperCase() as Currency;
        if (!currency) return null;

        const amount = toMinor(p);

        const rec: PriceRec = {
          currency,
          amount_minor: amount,
          // 兼容一些旧逻辑会读 rec.price：同样存 minor
          price: amount,
        };

        // 折扣字段（两种都支持）
        const disc = normalizeDiscountFields(p);
        if (disc.discount_percent_off != null) rec.discount_percent_off = disc.discount_percent_off;
        if (disc.discount != null) (rec as any).discount = disc.discount;

        // sale window
        if (p?.sale_starts_at) rec.sale_starts_at = String(p.sale_starts_at);
        if (p?.sale_ends_at) rec.sale_ends_at = String(p.sale_ends_at);

        return rec;
      })
      .filter(Boolean) as PriceRec[];

    // 确保是合法 minor
    return mapped.filter((r) => Number.isInteger(Number((r as any).amount_minor ?? (r as any).price)));
  }

  // ✅ 2) 否则 fallback：用 cart item 的 price/basePrice（major）推导一个单币种 PriceRec
  const currency = String(it?.currency || "AUD").toUpperCase() as Currency;

  const priceMajor = Number(it?.price) || 0; // 当前价（major）
  const baseMajor = Number(it?.basePrice ?? it?.price ?? 0); // 原价（major）

  const priceMinor = Math.max(0, Math.round(priceMajor * 100));
  const baseMinor = Math.max(0, Math.round(baseMajor * 100));
  const base = baseMinor || priceMinor;

  const rec: PriceRec = { currency, amount_minor: base, price: base };

  // 从 base/price 推导 percent_off（兼容旧 cart 结构）
  if (baseMinor > priceMinor && baseMinor > 0) {
    const off = Math.round((1 - priceMinor / baseMinor) * 100);
    rec.discount_percent_off = Math.max(0, Math.min(99, off));
  }

  return [rec];
}

/** base 值（minor） */
export const baseOf = (r: PriceRec) =>
  Math.max(0, Number((r as any).price ?? r.amount_minor ?? 0));

/**
 * 统一封装：
 * - 计算 itemsTotal（minor/major）
 * - 计算节省金额 savedMajor
 * - 计算运费、总价、Payment 金额
 */
export function usePricing(
  cart: any[],
  hasItems: boolean,
  displayCurrency: Currency,
  deliveryFreeThreshold: number,
  deliveryFlat: number
) {
  // 1) 把 cart 转成 pricingInput
  const pricingInput = useMemo(
    () =>
      cart.map((it: any) => ({
        qty: Number(it?.qty) || 1,
        prices: itemToPriceRecs(it),
      })),
    [cart]
  );

  // 2) 计算商品总价（不含运费）
  const itemsTotals = useMemo(() => {
    if (!pricingInput.length) {
      return {
        currency: displayCurrency as Currency,
        itemsMinor: 0,
        itemsMajor: 0,
      };
    }
    const { currency, totalMinor, totalMajor } = selectCurrencyAndTotals(
      pricingInput,
      displayCurrency,
      undefined,
      displayCurrency
    );
    return {
      currency,
      itemsMinor: totalMinor,
      itemsMajor: totalMajor,
    };
  }, [pricingInput, displayCurrency]);

  const currency = itemsTotals.currency as string;
  const itemsMinor = itemsTotals.itemsMinor;
  const itemsMajor = itemsTotals.itemsMajor;

  // 3) 计算节省金额（原价 - 现价）
  const savedMajor = useMemo(() => {
    let savedMinor = 0;

    for (const it of cart as any[]) {
      const qty = Number(it?.qty) || 1;
      const recs = itemToPriceRecs(it);

      const rec = recs.find((r) => r.currency === (currency as Currency));
      if (rec) {
        const base = baseOf(rec);
        const eff = effectiveMinor(rec);
        if (eff < base) savedMinor += (base - eff) * qty;
        continue;
      }

      // fallback（旧 cart 结构）
      const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
      const priceMajor = Number(it?.price ?? 0);
      if (baseMajor > priceMajor) {
        savedMinor += Math.round((baseMajor - priceMajor) * 100) * qty;
      }
    }

    return savedMinor / 100;
  }, [cart, currency]);

  // 4) 运费 & 总价
  const deliveryFeeMajor = hasItems && itemsMajor < deliveryFreeThreshold ? deliveryFlat : 0;
  const deliveryFeeMinor = Math.round(deliveryFeeMajor * 100);

  const totalMinor = itemsMinor + deliveryFeeMinor;
  const totalMajor = itemsMajor + deliveryFeeMajor;

  const amountInMajorUnit = Math.max(0, Number(totalMajor.toFixed(2)));

  return {
    currency,
    itemsMinor,
    itemsMajor,
    savedMajor,
    deliveryFeeMajor,
    deliveryFeeMinor,
    totalMinor,
    totalMajor,
    amountInMajorUnit,
  };
}
