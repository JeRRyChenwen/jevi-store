// src/lib/market/site-context.ts
import type { CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";
import { CURRENT_MARKET, CURRENT_STOREFRONT } from "./current";
import type { MarketCode, StorefrontCode } from "./types";

export type SiteContext = {
  market_code: MarketCode;
  storefront_code: StorefrontCode;
  default_country: CountryCode;
  default_currency: Currency;
  allowed_countries: CountryCode[];
  shipping_country_error_message: string;
  checkout_region_label: string;
};

export const FALLBACK_SITE_CONTEXT: SiteContext = {
  market_code: CURRENT_MARKET.code,
  storefront_code: CURRENT_STOREFRONT.code,
  default_country: CURRENT_STOREFRONT.primaryCountry,
  default_currency: CURRENT_STOREFRONT.defaultCurrency,
  allowed_countries: [...CURRENT_STOREFRONT.checkoutCountryCodes],
  shipping_country_error_message: CURRENT_STOREFRONT.shippingCountryErrorMessage,
  checkout_region_label: CURRENT_STOREFRONT.checkoutRegionLabel,
};

export function normalizeSiteContext(input: any): SiteContext {
  return {
    market_code: String(
      input?.market_code || FALLBACK_SITE_CONTEXT.market_code
    ).trim().toUpperCase() as MarketCode,

    storefront_code: String(
      input?.storefront_code || FALLBACK_SITE_CONTEXT.storefront_code
    ).trim().toUpperCase() as StorefrontCode,

    default_country: String(
      input?.default_country || FALLBACK_SITE_CONTEXT.default_country
    ).trim().toUpperCase() as CountryCode,

    default_currency: String(
      input?.default_currency || FALLBACK_SITE_CONTEXT.default_currency
    ).trim().toUpperCase() as Currency,

    allowed_countries:
      Array.isArray(input?.allowed_countries) && input.allowed_countries.length > 0
        ? input.allowed_countries
            .map((x: any) => String(x || "").trim().toUpperCase() as CountryCode)
            .filter(Boolean)
        : FALLBACK_SITE_CONTEXT.allowed_countries,

    shipping_country_error_message: String(
      input?.shipping_country_error_message ||
        FALLBACK_SITE_CONTEXT.shipping_country_error_message
    ).trim(),

    checkout_region_label: String(
      input?.checkout_region_label || FALLBACK_SITE_CONTEXT.checkout_region_label
    ).trim(),
  };
}