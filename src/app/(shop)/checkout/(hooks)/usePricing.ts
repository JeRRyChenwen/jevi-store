// src/app/checkout/(hooks)/usePricing.ts
"use client";

import { useMemo } from "react";
import { selectCurrencyAndTotals } from "@/lib/cartPricing";
import { effectiveMinor, type PriceRec, type Currency } from "@/lib/pricing";

/**
 * 把商品条目转成定价记录数组（兼容 Strapi 的 prices、多币种、折扣价）
 */
export function itemToPriceRecs(it: any): PriceRec[] {
  if (Array.isArray(it?.prices) && it.prices.length) {
    return it.prices
      .map((p: any) => {
        const currency = String(p?.currency || "").toUpperCase() as Currency;
        const amount = Math.max(0, Math.round(Number(p?.price) || 0));
        const rec: PriceRec = { currency, amount_minor: amount, price: amount };
        if (p?.discount_percent_off != null) {
          rec.discount_percent_off = Number(p.discount_percent_off);
        }
        if (p?.sale_starts_at) rec.sale_starts_at = String(p.sale_starts_at);
        if (p?.sale_ends_at) rec.sale_ends_at = String(p.sale_ends_at);
        return rec;
      })
      .filter((r: PriceRec) => Number.isInteger((r as any).price ?? r.amount_minor));
  }

  const currency = String(it?.currency || "AUD").toUpperCase() as Currency;
  const priceMajor = Number(it?.price) || 0;
  const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
  const priceMinor = Math.max(0, Math.round(priceMajor * 100));
  const baseMinor = Math.max(0, Math.round(baseMajor * 100));
  const base = baseMinor || priceMinor;
  const rec: PriceRec = { currency, amount_minor: base, price: base };

  if (baseMinor > priceMinor && baseMinor > 0) {
    const off = Math.round((1 - priceMinor / baseMinor) * 100);
    rec.discount_percent_off = Math.max(0, off);
  }

  return [rec];
}

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
      } else {
        const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
        const priceMajor = Number(it?.price ?? 0);
        if (baseMajor > priceMajor) {
          savedMinor += Math.round((baseMajor - priceMajor) * 100) * qty;
        }
      }
    }
    return savedMinor / 100;
  }, [cart, currency]);

  // 4) 运费 & 总价
  const deliveryFeeMajor =
    hasItems && itemsMajor < deliveryFreeThreshold ? deliveryFlat : 0;
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
