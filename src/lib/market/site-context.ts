// src/lib/market/site-context.ts
import type { CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";
import { CURRENT_MARKET } from "./current";
import type { MarketCode } from "./types";

export type SiteContext = {
  market_code: MarketCode;
  default_country: CountryCode;
  default_currency: Currency;
  allowed_countries: CountryCode[];
  shipping_country_error_message: string;
  checkout_region_label: string;
};

export const FALLBACK_SITE_CONTEXT: SiteContext = {
  market_code: CURRENT_MARKET.code,
  default_country: CURRENT_MARKET.primaryCountry,
  default_currency: CURRENT_MARKET.defaultCurrency,
  allowed_countries: [...CURRENT_MARKET.checkoutCountryCodes],
  shipping_country_error_message: CURRENT_MARKET.shippingCountryErrorMessage,
  checkout_region_label: CURRENT_MARKET.checkoutRegionLabel,
};

export function normalizeSiteContext(input: any): SiteContext {
  return {
    market_code: String(
      input?.market_code || FALLBACK_SITE_CONTEXT.market_code
    ).trim().toUpperCase() as MarketCode,

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