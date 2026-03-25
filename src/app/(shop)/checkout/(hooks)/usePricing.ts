// src/app/checkout/(hooks)/usePricing.ts
"use client";

import { useMemo } from "react";
import { selectCurrencyAndTotals } from "@/lib/cartPricing";
import { type PriceRec, type Currency } from "@/lib/pricing";

/**
 * ✅ 统一：把各种字段都当作 minor（分）整数读取（不再 *100）
 */
function toMinorInt(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * ✅ 从一条 price record 里读取：
 * - baseMinor：原价（minor）
 * - effMinor：成交价（minor）
 *
 * 兼容来源：
 * 1) 你最新 bag 写入：price_minor + sale_price_minor
 * 2) 旧/Strapi 写法：price + real_price / amount_minor
 */
function readBaseAndEffectiveMinor(p: any): { baseMinor: number; effMinor: number } {
  const baseMinor =
    toMinorInt(p?.price_minor) ||
    toMinorInt(p?.price) ||
    toMinorInt(p?.amount_minor) ||
    0;

  const effMinor =
    toMinorInt(p?.sale_price_minor) ||
    toMinorInt(p?.real_price) ||
    toMinorInt(p?.amount_minor) ||
    toMinorInt(p?.price_minor) ||
    toMinorInt(p?.price) ||
    0;

  return { baseMinor, effMinor };
}

/**
 * 把商品条目转成定价记录数组（给 cartPricing 统一计算用）
 *
 * ✅ 新约定：
 * - rec.amount_minor = 成交价（最终价，minor）
 * - rec.price = 同 amount_minor（兼容旧逻辑）
 *
 * 注意：不再在前端计算折扣；discount/window 字段对结算不再需要
 */
export function itemToPriceRecs(it: any, fallbackCurrency: Currency): PriceRec[] {
  const rawPrices = it?.prices;

  // 1) 优先用 it.prices（来自 Strapi Product.prices 或 bag 中持久化的 prices）
  if (Array.isArray(rawPrices) && rawPrices.length) {
    const mapped = rawPrices
      .map((p: any) => {
        const currency = String(p?.currency || "").toUpperCase() as Currency;
        if (!currency) return null;

        const { baseMinor, effMinor } = readBaseAndEffectiveMinor(p);

        // ✅ 成交价必须 >0 才算有效；否则兜底 base
        const finalMinor = effMinor > 0 ? effMinor : baseMinor;

        const rec: PriceRec = {
          currency,
          amount_minor: finalMinor,
          price: finalMinor,
          price_minor: baseMinor > 0 ? baseMinor : undefined,
        };

        return rec;
      })
      .filter(Boolean) as PriceRec[];

    return mapped;
  }

  // 2) fallback（旧 cart 结构过渡）
  const currency = String(it?.currency || fallbackCurrency).toUpperCase() as Currency;

  // 如果旧 item 里有 real_price（minor）就用它，否则用 price（但这里无法判断它是不是 major）
  const realMinor = toMinorInt(it?.real_price ?? 0);
  const maybeMinor = toMinorInt(it?.price ?? 0);
  const finalMinor = realMinor > 0 ? realMinor : maybeMinor;

  const rec: PriceRec = { currency, amount_minor: finalMinor, price: finalMinor };
  return [rec];
}

/**
 * 统一封装：
 * - itemsMinor / itemsMajor
 * - savedMajor（如果存在原价字段，则 base - effective）
 * - delivery fee / total
 *
 * ✅ 重要：deliveryFreeThreshold / deliveryFlat 都按 minor（分）传入
 */
export function usePricing(
  cart: any[],
  hasItems: boolean,
  displayCurrency: Currency,
  deliveryFreeThreshold: number, // minor（分）
  deliveryFlat: number // minor（分）
) {
  // 1) 把 cart 转成 pricingInput
  const pricingInput = useMemo(
    () =>
      cart.map((it: any) => ({
        qty: Number(it?.qty) || 1,
        prices: itemToPriceRecs(it, displayCurrency),
      })),
    [cart, displayCurrency]
  );

  // 2) 计算商品总价（不含运费）
  const itemsTotals = useMemo(() => {
    if (!pricingInput.length) {
      return {
        currency: displayCurrency as Currency,
        itemsMinor: 0,
      };
    }

    const { currency, totalMinor } = selectCurrencyAndTotals(
      pricingInput,
      displayCurrency,
      undefined,
      displayCurrency
    );

    return {
      currency: currency as Currency,
      itemsMinor: totalMinor,
    };
  }, [pricingInput, displayCurrency]);

  const currency = itemsTotals.currency as Currency;
  const itemsMinor = toMinorInt(itemsTotals.itemsMinor);
  const itemsMajor = Number((itemsMinor / 100).toFixed(2));

  // 3) 计算节省金额（原价 - 现价）
  // ✅ 同时兼容：
  // - price_minor - sale_price_minor
  // - price - real_price
  const savedMajor = useMemo(() => {
    let savedMinor = 0;

    for (const it of cart as any[]) {
      const qty = Number(it?.qty) || 1;
      const prices = Array.isArray(it?.prices) ? it.prices : [];

      const p = prices.find(
        (x: any) => String(x?.currency || "").toUpperCase() === String(currency).toUpperCase()
      );

      if (!p) continue;

      const { baseMinor, effMinor } = readBaseAndEffectiveMinor(p);

      // base 必须 > eff 才有 savings
      if (baseMinor > 0 && effMinor > 0 && baseMinor > effMinor) {
        savedMinor += (baseMinor - effMinor) * qty;
      }
    }

    return Number((savedMinor / 100).toFixed(2));
  }, [cart, currency]);

  // 4) 运费 & 总价（全程 minor）
  const thresholdMinor = toMinorInt(deliveryFreeThreshold);
  const flatMinor = toMinorInt(deliveryFlat);

  const deliveryFeeMinor = hasItems && itemsMinor < thresholdMinor ? flatMinor : 0;
  const deliveryFeeMajor = Number((deliveryFeeMinor / 100).toFixed(2));

  const totalMinor = itemsMinor + deliveryFeeMinor;
  const totalMajor = Number((totalMinor / 100).toFixed(2));

  const amountInMajorUnit = totalMajor;

  return {
    currency,

    itemsMinor,
    itemsMajor,

    savedMajor,

    deliveryFeeMinor,
    deliveryFeeMajor,

    totalMinor,
    totalMajor,

    amountInMajorUnit,
  };
}
