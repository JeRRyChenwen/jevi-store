// src/lib/market/site-context.ts
import type { CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";
import { CURRENT_STOREFRONT } from "./current";
import type { StorefrontCode } from "./types";

export type SiteContext = {
  storefront_code: StorefrontCode;
  default_country: CountryCode;
  default_currency: Currency;
  allowed_countries: CountryCode[];
  shipping_country_error_message: string;
  checkout_region_label: string;
};

/**
 * storefront_code 是当前前端站点的唯一主驱动配置。
 * default_country / default_currency / allowed_countries /
 * shipping_country_error_message / checkout_region_label
 * 都由 storefront 决定。
 */
export const FALLBACK_SITE_CONTEXT: SiteContext = {
  storefront_code: CURRENT_STOREFRONT.code,
  default_country: CURRENT_STOREFRONT.primaryCountry,
  default_currency: CURRENT_STOREFRONT.defaultCurrency,
  allowed_countries: [...CURRENT_STOREFRONT.checkoutCountryCodes],
  shipping_country_error_message: CURRENT_STOREFRONT.shippingCountryErrorMessage,
  checkout_region_label: CURRENT_STOREFRONT.checkoutRegionLabel,
};

export function normalizeSiteContext(input: any): SiteContext {
  return {
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