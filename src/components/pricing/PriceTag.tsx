// src/components/pricing/PriceTag.tsx
"use client";

import {
  effectiveMinor,
  minorToMajor,
  pickCurrency,
  type PriceRec,
  type Currency,
} from "@/lib/pricing";

type Props = {
  prices: PriceRec[];          // 来自 Strapi 的 product.prices
  userCurrency?: string | null;
  userCountry?: string | null;
  className?: string;
};

export default function PriceTag({
  prices,
  userCurrency,
  userCountry,
  className,
}: Props) {
  if (!prices || prices.length === 0) return null;

  // 可用币种列表
  const available: Currency[] = prices.map((p) => p.currency);

  // 选择要展示的币种（根据用户/国家，带 fallback）
  const currency = pickCurrency(available, {
    userCurrency: userCurrency ?? undefined,
    userCountry: userCountry ?? undefined,
    fallback: available[0] ?? "AUD",
  });

  // 找到该币种对应的价格记录（兜底用第 1 条）
  const rec = prices.find((p) => p.currency === currency) ?? prices[0];

  const minor = effectiveMinor(rec);
  const display = minorToMajor(minor, rec.currency);

  return <span className={className}>{rec.currency} {display}</span>;
}
