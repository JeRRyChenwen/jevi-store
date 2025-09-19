// src/lib/cartPricing.ts
import { effectiveMinor, minorToMajor, pickCurrency, type PriceRec } from "@/lib/pricing";

export function selectCurrencyAndTotals(
  items: { qty: number; prices: PriceRec[] }[],
  userCurrency?: string | null,
  userCountry?: string | null,
  fallback: "AUD" | "USD" | "EUR" | "GBP" | "CAD" = "AUD"
) {
  const available = Array.from(
    new Set(items.flatMap(i => i.prices.map(p => p.currency)))
  ) as PriceRec["currency"][];

  const currency = pickCurrency(available, { userCurrency, userCountry, fallback });

  const totalMinor = items.reduce((sum, it) => {
    const rec = it.prices.find(p => p.currency === currency);
    if (!rec) return sum; // 缺该币种可在此做兜底/报错
    return sum + effectiveMinor(rec) * it.qty;
  }, 0);

  const totalMajor = Number(minorToMajor(totalMinor, currency));

  return { currency, totalMinor, totalMajor };
}
