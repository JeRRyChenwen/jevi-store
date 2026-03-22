// src/lib/market/config.ts
import { COUNTRY_OPTIONS, type CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";

export type MarketCode = "AU_NZ" | "EU" | "US_CA";

export type MarketConfig = {
  code: MarketCode;
  label: string;

  /**
   * ✅ 当前市场默认展示币种
   * - AU_NZ -> AUD
   * - EU    -> EUR
   * - US_CA -> USD（先这样，后续可升级为“同市场按国家切换 USD/CAD”）
   */
  defaultCurrency: Currency;

  /**
   * ✅ 当前市场 checkout 允许选择的国家
   */
  checkoutCountryCodes: readonly CountryCode[];
  checkoutCountries: readonly { code: CountryCode; label: string }[];

  /**
   * ✅ 当前市场的首选 / 默认国家
   * 用于地址恢复失败、shipping quote fallback 等场景
   */
  primaryCountry: CountryCode;

  /**
   * ✅ 当前市场统一文案
   */
  shippingCountryErrorMessage: string;
  checkoutRegionLabel: string;
};

const COUNTRY_LABEL_MAP = new Map<string, string>(
  COUNTRY_OPTIONS.map((item) => [item.code, item.label])
);

function buildCountryOptions(codes: readonly CountryCode[]) {
  return codes.map((code) => ({
    code,
    label: COUNTRY_LABEL_MAP.get(code) ?? code,
  }));
}

export const MARKET_CONFIGS: Record<MarketCode, MarketConfig> = {
  AU_NZ: {
    code: "AU_NZ",
    label: "Australia & New Zealand",
    defaultCurrency: "AUD",
    checkoutCountryCodes: ["AU", "NZ"],
    checkoutCountries: buildCountryOptions(["AU", "NZ"]),
    primaryCountry: "AU",
    shippingCountryErrorMessage:
      "We currently only ship to Australia and New Zealand. Please update your delivery address to continue.",
    checkoutRegionLabel: "Australia and New Zealand",
  },

  EU: {
    code: "EU",
    label: "Europe",
    defaultCurrency: "EUR",
    checkoutCountryCodes: ["DE", "FR", "IT", "ES", "NL", "BE"],
    checkoutCountries: buildCountryOptions(["DE", "FR", "IT", "ES", "NL", "BE"]),
    primaryCountry: "DE",
    shippingCountryErrorMessage:
      "We currently only ship to selected European destinations for this storefront. Please update your delivery address to continue.",
    checkoutRegionLabel: "selected European destinations",
  },

  US_CA: {
    code: "US_CA",
    label: "United States & Canada",
    defaultCurrency: "USD",
    checkoutCountryCodes: ["US", "CA"],
    checkoutCountries: buildCountryOptions(["US", "CA"]),
    primaryCountry: "US",
    shippingCountryErrorMessage:
      "We currently only ship to the United States and Canada for this storefront. Please update your delivery address to continue.",
    checkoutRegionLabel: "the United States and Canada",
  },
};