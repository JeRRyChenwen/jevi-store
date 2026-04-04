// src/lib/market/current.ts
import { MARKET_CONFIGS, STOREFRONT_CONFIGS } from "./config";
import type {
  MarketCode,
  MarketConfig,
  PaymentMethodCode,
  StorefrontCode,
  StorefrontConfig,
} from "./types";

function normalizeMarketCode(input?: string | null): MarketCode {
  const v = String(input || "").trim().toUpperCase();

  if (v === "AU_NZ") return "AU_NZ";
  if (v === "EU") return "EU";
  if (v === "US_CA") return "US_CA";

  return "AU_NZ";
}

function normalizeStorefrontCode(input?: string | null): StorefrontCode {
  const v = String(input || "").trim().toUpperCase();

  if (v === "AU") return "AU";
  if (v === "NZ") return "NZ";
  if (v === "EU") return "EU";
  if (v === "US") return "US";
  if (v === "CA") return "CA";
  if (v === "DE") return "DE";
  if (v === "FR") return "FR";
  if (v === "IT") return "IT";
  if (v === "ES") return "ES";
  if (v === "NL") return "NL";
  if (v === "BE") return "BE";

  return "AU";
}

/**
 * ✅ 当前 storefront code
 * 现在先优先读 storefront 环境变量；
 * 如果以后你想升级成按 host 自动识别（例如 au.xxx.com / nz.xxx.com），
 * 我们再在这里继续扩展。
 */
export function getCurrentStorefrontCode(): StorefrontCode {
  return normalizeStorefrontCode(
    process.env.NEXT_PUBLIC_STOREFRONT_CODE ||
      process.env.STOREFRONT_CODE ||
      null
  );
}

/**
 * ✅ 当前 storefront 配置
 */
export function getCurrentStorefront(): StorefrontConfig {
  return STOREFRONT_CONFIGS[getCurrentStorefrontCode()];
}

/**
 * ✅ 按 storefront code 取 storefront 配置
 */
export function getStorefrontByCode(code?: string | null): StorefrontConfig {
  return STOREFRONT_CONFIGS[normalizeStorefrontCode(code)];
}

/**
 * ✅ 当前 market code
 * 现在优先由 storefront 派生；
 * 如果 storefront 没配置好，再回退到原来的 market env。
 */
export function getCurrentMarketCode(): MarketCode {
  const storefront = getCurrentStorefront();
  if (storefront?.marketCode) return storefront.marketCode;

  return normalizeMarketCode(
    process.env.NEXT_PUBLIC_MARKET ||
      process.env.NEXT_PUBLIC_MARKET_CODE ||
      process.env.MARKET ||
      process.env.MARKET_CODE ||
      "AU_NZ"
  );
}

/**
 * ✅ 当前 market 配置
 */
export function getCurrentMarket(): MarketConfig {
  return MARKET_CONFIGS[getCurrentMarketCode()];
}

/**
 * ✅ 按 market code 取 market 配置
 */
export function getMarketByCode(code?: string | null): MarketConfig {
  return MARKET_CONFIGS[normalizeMarketCode(code)];
}

/**
 * ✅ storefront 的默认展示币种
 * 以后前台默认优先读 storefront，不再依赖 market.countryOverrides。
 */
export function getEffectiveCurrency(
  storefront: StorefrontConfig = getCurrentStorefront()
) {
  return storefront.defaultCurrency;
}

/**
 * ✅ storefront 的可用支付方式
 * 若 storefront 没显式配置，则回退到默认 ["paypal", "card"]。
 */
export function getEffectivePaymentMethods(
  storefront: StorefrontConfig = getCurrentStorefront()
): readonly PaymentMethodCode[] {
  return storefront.paymentMethods ?? ["paypal", "card"];
}

/**
 * ✅ 兼容旧调用方
 * 很多旧代码可能还在直接读 CURRENT_MARKET，
 * 所以这里先保留。
 */
export const CURRENT_MARKET = getCurrentMarket();

/**
 * ✅ 新增：当前 storefront 常量
 */
export const CURRENT_STOREFRONT = getCurrentStorefront();