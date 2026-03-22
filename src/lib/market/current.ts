// src/lib/market/current.ts
import { MARKET_CONFIGS, type MarketCode, type MarketConfig } from "./config";

function normalizeMarketCode(input?: string | null): MarketCode {
  const v = String(input || "").trim().toUpperCase();

  if (v === "AU_NZ") return "AU_NZ";
  if (v === "EU") return "EU";
  if (v === "US_CA") return "US_CA";

  return "AU_NZ";
}

export function getCurrentMarketCode(): MarketCode {
  return normalizeMarketCode(
    process.env.NEXT_PUBLIC_MARKET || process.env.MARKET || "AU_NZ"
  );
}

export function getCurrentMarket(): MarketConfig {
  return MARKET_CONFIGS[getCurrentMarketCode()];
}

export const CURRENT_MARKET = getCurrentMarket();