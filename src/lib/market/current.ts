// src/lib/market/current.ts
import type { CountryCode } from "@/lib/country";
import { MARKET_CONFIGS } from "./config";
import type {
  MarketCode,
  MarketConfig,
  MarketCountryOverride,
} from "./types";

function normalizeMarketCode(input?: string | null): MarketCode {
  const v = String(input || "").trim().toUpperCase();

  if (v === "AU_NZ") return "AU_NZ";
  if (v === "EU") return "EU";
  if (v === "US_CA") return "US_CA";

  return "AU_NZ";
}

export function getCurrentMarketCode(): MarketCode {
  return normalizeMarketCode(
    process.env.NEXT_PUBLIC_MARKET ||
      process.env.NEXT_PUBLIC_MARKET_CODE ||
      process.env.MARKET ||
      process.env.MARKET_CODE ||
      "AU_NZ"
  );
}

export function getCurrentMarket(): MarketConfig {
  return MARKET_CONFIGS[getCurrentMarketCode()];
}

export function getMarketByCode(code?: string | null): MarketConfig {
  return MARKET_CONFIGS[normalizeMarketCode(code)];
}

export function getCountryOverride(
  countryCode?: string | null,
  market: MarketConfig = getCurrentMarket()
): MarketCountryOverride | undefined {
  const code = String(countryCode || "").trim().toUpperCase() as CountryCode;
  return market.countryOverrides?.[code];
}

export function getEffectiveCurrency(
  countryCode?: string | null,
  market: MarketConfig = getCurrentMarket()
) {
  return getCountryOverride(countryCode, market)?.currency ?? market.defaultCurrency;
}

export function getEffectivePaymentMethods(
  countryCode?: string | null,
  market: MarketConfig = getCurrentMarket()
) {
  return (
    getCountryOverride(countryCode, market)?.paymentMethods ?? ["paypal", "card"]
  );
}

export const CURRENT_MARKET = getCurrentMarket();