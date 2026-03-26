// src/lib/market/config.ts
import { COUNTRY_OPTIONS, type CountryCode } from "@/lib/country";
import type { MarketCode, MarketConfig } from "./types";

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

export const MARKET_CONFIGS: Record<MarketCode, MarketConfig> = {
  AU_NZ: {
    code: "AU_NZ",
    label: "Australia & New Zealand",

    defaultCurrency: "AUD",
    defaultTimezone: "Australia/Sydney",

    checkoutCountryCodes: ["AU", "NZ"],
    checkoutCountries: buildCountryOptions(["AU", "NZ"]),
    primaryCountry: "AU",

    shippingCountryErrorMessage:
      "We currently only ship to Australia and New Zealand. Please update your delivery address to continue.",
    checkoutRegionLabel: "Australia and New Zealand",

    legalRegionLabel: "Australia and New Zealand",
    supportRegionLabel: "Australia and New Zealand",
    policyVariant: "au_nz",

    siteUrl: envSiteUrl("https://example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    countryOverrides: {
      AU: {
        currency: "AUD",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Australia",
        taxLabel: "GST where applicable",
        returnsPolicyLabel: "Australia returns policy",
      },
      NZ: {
        currency: "AUD",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "New Zealand",
        taxLabel: "Taxes and duties may vary by destination",
        returnsPolicyLabel: "New Zealand returns policy",
      },
    },
  },

  EU: {
    code: "EU",
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

    siteUrl: envSiteUrl("https://example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    countryOverrides: {
      DE: {
        currency: "EUR",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Germany",
      },
      FR: {
        currency: "EUR",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "France",
      },
      IT: {
        currency: "EUR",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Italy",
      },
      ES: {
        currency: "EUR",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Spain",
      },
      NL: {
        currency: "EUR",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Netherlands",
      },
      BE: {
        currency: "EUR",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Belgium",
      },
    },
  },

  US_CA: {
    code: "US_CA",
    label: "United States & Canada",

    defaultCurrency: "USD",
    defaultTimezone: "America/Los_Angeles",

    checkoutCountryCodes: ["US", "CA"],
    checkoutCountries: buildCountryOptions(["US", "CA"]),
    primaryCountry: "US",

    shippingCountryErrorMessage:
      "We currently only ship to the United States and Canada for this storefront. Please update your delivery address to continue.",
    checkoutRegionLabel: "the United States and Canada",

    legalRegionLabel: "the United States and Canada",
    supportRegionLabel: "North America",
    policyVariant: "us_ca",

    siteUrl: envSiteUrl("https://example.com"),
    supportEmail: envSupportEmail("support@example.com"),

    countryOverrides: {
      US: {
        currency: "USD",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "United States",
      },
      CA: {
        currency: "CAD",
        paymentMethods: ["paypal", "card"],
        shippingRegionLabel: "Canada",
      },
    },
  },
};