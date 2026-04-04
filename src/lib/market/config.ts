// src/lib/market/config.ts
import { COUNTRY_OPTIONS, type CountryCode } from "@/lib/country";
import type {
  MarketCode,
  MarketConfig,
  StorefrontCode,
  StorefrontConfig,
} from "./types";

const COUNTRY_LABEL_MAP = new Map<string, string>(
  COUNTRY_OPTIONS.map((item) => [item.code, item.label])
);

function buildCountryOptions(codes: readonly CountryCode[]) {
  return codes.map((code) => ({
    code,
    label: COUNTRY_LABEL_MAP.get(code) ?? code,
  }));
}

function envSiteUrl(fallback: string) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    fallback
  );
}

function envSupportEmail(fallback: string) {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || fallback;
}

/**
 * ✅ market 层：
 * 只放“运营分组”的共性。
 * 不再直接承担 storefront 的 checkout / 文案 / 国家限制。
 */
export const MARKET_CONFIGS: Record<MarketCode, MarketConfig> = {
  AU_NZ: {
    code: "AU_NZ",
    label: "Australia & New Zealand",

    defaultCurrency: "AUD",
    defaultTimezone: "Australia/Sydney",
    policyVariant: "au_nz",

    siteUrl: envSiteUrl("https://example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    storefrontCodes: ["AU", "NZ"],
  },

  EU: {
    code: "EU",
    label: "Europe",

    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Berlin",
    policyVariant: "eu",

    siteUrl: envSiteUrl("https://example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    storefrontCodes: ["EU"],
  },

  US_CA: {
    code: "US_CA",
    label: "United States & Canada",

    defaultCurrency: "USD",
    defaultTimezone: "America/Los_Angeles",
    policyVariant: "us_ca",

    siteUrl: envSiteUrl("https://example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    storefrontCodes: ["US", "CA"],
  },
};

/**
 * ✅ storefront 层：
 * 这才是前台真正应该读取的配置。
 */
export const STOREFRONT_CONFIGS: Record<StorefrontCode, StorefrontConfig> = {
  AU: {
    code: "AU",
    marketCode: "AU_NZ",
    countryCode: "AU",
    label: "Australia",

    defaultCurrency: "AUD",
    defaultTimezone: "Australia/Sydney",

    checkoutCountryCodes: ["AU"],
    checkoutCountries: buildCountryOptions(["AU"]),
    primaryCountry: "AU",

    shippingCountryErrorMessage:
      "We currently only ship within Australia. Please update your delivery address to continue.",
    checkoutRegionLabel: "Australia",

    legalRegionLabel: "Australia",
    supportRegionLabel: "Australia",
    policyVariant: "au",

    siteUrl: envSiteUrl("https://au.example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    paymentMethods: ["paypal", "card"],
  },

  NZ: {
    code: "NZ",
    marketCode: "AU_NZ",
    countryCode: "NZ",
    label: "New Zealand",

    defaultCurrency: "NZD",
    defaultTimezone: "Pacific/Auckland",

    checkoutCountryCodes: ["NZ"],
    checkoutCountries: buildCountryOptions(["NZ"]),
    primaryCountry: "NZ",

    shippingCountryErrorMessage:
      "We currently only ship within New Zealand. Please update your delivery address to continue.",
    checkoutRegionLabel: "New Zealand",

    legalRegionLabel: "New Zealand",
    supportRegionLabel: "New Zealand",
    policyVariant: "nz",

    siteUrl: envSiteUrl("https://nz.example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    paymentMethods: ["paypal", "card"],
  },

  EU: {
    code: "EU",
    marketCode: "EU",
    countryCode: "DE",
    label: "Europe",

    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Berlin",

    checkoutCountryCodes: ["DE", "FR", "IT", "ES", "NL", "BE"],
    checkoutCountries: buildCountryOptions(["DE", "FR", "IT", "ES", "NL", "BE"]),
    primaryCountry: "DE",

    shippingCountryErrorMessage:
      "We currently only ship to selected European destinations for this storefront. Please update your delivery address to continue.",
    checkoutRegionLabel: "selected European destinations",

    legalRegionLabel: "selected European destinations",
    supportRegionLabel: "Europe",
    policyVariant: "eu",

    siteUrl: envSiteUrl("https://eu.example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    paymentMethods: ["paypal", "card"],
  },

  US: {
    code: "US",
    marketCode: "US_CA",
    countryCode: "US",
    label: "United States",

    defaultCurrency: "USD",
    defaultTimezone: "America/Los_Angeles",

    checkoutCountryCodes: ["US"],
    checkoutCountries: buildCountryOptions(["US"]),
    primaryCountry: "US",

    shippingCountryErrorMessage:
      "We currently only ship within the United States. Please update your delivery address to continue.",
    checkoutRegionLabel: "the United States",

    legalRegionLabel: "the United States",
    supportRegionLabel: "the United States",
    policyVariant: "us",

    siteUrl: envSiteUrl("https://us.example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    paymentMethods: ["paypal", "card"],
  },

  CA: {
    code: "CA",
    marketCode: "US_CA",
    countryCode: "CA",
    label: "Canada",

    defaultCurrency: "CAD",
    defaultTimezone: "America/Toronto",

    checkoutCountryCodes: ["CA"],
    checkoutCountries: buildCountryOptions(["CA"]),
    primaryCountry: "CA",

    shippingCountryErrorMessage:
      "We currently only ship within Canada. Please update your delivery address to continue.",
    checkoutRegionLabel: "Canada",

    legalRegionLabel: "Canada",
    supportRegionLabel: "Canada",
    policyVariant: "ca",

    siteUrl: envSiteUrl("https://ca.example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    paymentMethods: ["paypal", "card"],
  },

  /**
   * ✅ 这些国家 storefront 先预留类型位，
   * 但当前阶段你还没正式启用，所以不在这里配置。
   * 等未来 EU 要拆国家站时再补。
   */
  DE: undefined as never,
  FR: undefined as never,
  IT: undefined as never,
  ES: undefined as never,
  NL: undefined as never,
  BE: undefined as never,
};