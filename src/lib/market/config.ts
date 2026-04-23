// src/lib/market/config.ts
import { BRAND } from "@/lib/brand";
import { COUNTRY_OPTIONS, type CountryCode } from "@/lib/country";
import type { StorefrontCode, StorefrontConfig } from "./types";

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
 * ✅ storefront 层：
 * 这才是前台真正应该读取的配置。
 * 前端不再保留 market 作为主驱动配置。
 */
export const STOREFRONT_CONFIGS: Record<StorefrontCode, StorefrontConfig> = {
  AU: {
    code: "AU",
    countryCode: "AU",
    label: "Australia",

    defaultCurrency: "AUD",
    defaultTimezone: "Australia/Sydney",

    checkoutCountryCodes: ["AU"],
    checkoutCountries: buildCountryOptions(["AU"]),
    primaryCountry: "AU",

    shippingCountryErrorMessage:
      "We currently only ship within Australia. Please update your delivery address to continue.",
    shippingNotice: "Shipping available within Australia only.",
    checkoutRegionLabel: "Australia",

    legalRegionLabel: "Australia",
    supportRegionLabel: "Australia",
    policyVariant: "au",

    siteUrl: envSiteUrl("https://au.example.com"),
    supportEmail: envSupportEmail(BRAND.supportEmail),

    paymentMethods: ["paypal", "card"],

    legalEntityName: BRAND.legalEntityName,
    legalEntityAddress: BRAND.legalEntityAddress,
    legalEntityCountry: "Australia",
    companyRegistrationNumber: BRAND.companyRegistrationNumber,
    privacyContactEmail: BRAND.privacyContactEmail,
    returnsContactEmail: BRAND.returnsContactEmail,
    governingLawLabel: "Laws of Australia",
    supportedCountriesForStorefront: ["AU"],
    returnWindowDaysChangeOfMind: 14,
    hasEuWithdrawalRight: false,
    cookieConsentMode: "optional_settings_only",
  },

  NZ: {
    code: "NZ",
    countryCode: "NZ",
    label: "New Zealand",

    defaultCurrency: "NZD",
    defaultTimezone: "Pacific/Auckland",

    checkoutCountryCodes: ["NZ"],
    checkoutCountries: buildCountryOptions(["NZ"]),
    primaryCountry: "NZ",

    shippingCountryErrorMessage:
      "We currently only ship within New Zealand. Please update your delivery address to continue.",
    shippingNotice: "Shipping available within New Zealand only.",
    checkoutRegionLabel: "New Zealand",

    legalRegionLabel: "New Zealand",
    supportRegionLabel: "New Zealand",
    policyVariant: "nz",

    siteUrl: envSiteUrl("https://nz.example.com"),
    supportEmail: envSupportEmail(BRAND.supportEmail),

    paymentMethods: ["paypal", "card"],

    legalEntityName: BRAND.legalEntityName,
    legalEntityAddress: BRAND.legalEntityAddress,
    legalEntityCountry: "Australia",
    companyRegistrationNumber: BRAND.companyRegistrationNumber,
    privacyContactEmail: BRAND.privacyContactEmail,
    returnsContactEmail: BRAND.returnsContactEmail,
    governingLawLabel: "Laws of New Zealand",
    supportedCountriesForStorefront: ["NZ"],
    returnWindowDaysChangeOfMind: 14,
    hasEuWithdrawalRight: false,
    cookieConsentMode: "optional_settings_only",
  },

  EU: {
    code: "EU",
    countryCode: "DE",
    label: "Europe",

    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Berlin",

    checkoutCountryCodes: ["DE", "FR", "IT", "ES", "NL", "BE"],
    checkoutCountries: buildCountryOptions(["DE", "FR", "IT", "ES", "NL", "BE"]),
    primaryCountry: "DE",

    shippingCountryErrorMessage:
      "We currently only ship to selected European destinations for this storefront. Please update your delivery address to continue.",
    shippingNotice: "Shipping available to selected European destinations only.",
    checkoutRegionLabel: "selected European destinations",

    legalRegionLabel: "selected European destinations",
    supportRegionLabel: "Europe",
    policyVariant: "eu",

    siteUrl: envSiteUrl("https://eu.example.com"),
    supportEmail: envSupportEmail(BRAND.supportEmail),

    paymentMethods: ["paypal", "card"],

    legalEntityName: BRAND.legalEntityName,
    legalEntityAddress: BRAND.legalEntityAddress,
    legalEntityCountry: "Australia",
    companyRegistrationNumber: BRAND.companyRegistrationNumber,
    privacyContactEmail: BRAND.privacyContactEmail,
    returnsContactEmail: BRAND.returnsContactEmail,
    governingLawLabel: "Applicable laws governing this European storefront",
    supportedCountriesForStorefront: ["DE", "FR", "IT", "ES", "NL", "BE"],
    returnWindowDaysChangeOfMind: 14,
    hasEuWithdrawalRight: true,
    cookieConsentMode: "eu_strict",
  },

  US: {
    code: "US",
    countryCode: "US",
    label: "United States",

    defaultCurrency: "USD",
    defaultTimezone: "America/Los_Angeles",

    checkoutCountryCodes: ["US"],
    checkoutCountries: buildCountryOptions(["US"]),
    primaryCountry: "US",

    shippingCountryErrorMessage:
      "We currently only ship within the United States. Please update your delivery address to continue.",
    shippingNotice: "Shipping available within the United States only.",
    checkoutRegionLabel: "the United States",

    legalRegionLabel: "the United States",
    supportRegionLabel: "the United States",
    policyVariant: "us",

    siteUrl: envSiteUrl("https://us.example.com"),
    supportEmail: envSupportEmail(BRAND.supportEmail),

    paymentMethods: ["paypal", "card"],

    legalEntityName: BRAND.legalEntityName,
    legalEntityAddress: BRAND.legalEntityAddress,
    legalEntityCountry: "Australia",
    companyRegistrationNumber: BRAND.companyRegistrationNumber,
    privacyContactEmail: BRAND.privacyContactEmail,
    returnsContactEmail: BRAND.returnsContactEmail,
    governingLawLabel: "Applicable laws governing this United States storefront",
    supportedCountriesForStorefront: ["US"],
    returnWindowDaysChangeOfMind: 14,
    hasEuWithdrawalRight: false,
    cookieConsentMode: "optional_settings_only",
  },

  CA: {
    code: "CA",
    countryCode: "CA",
    label: "Canada",

    defaultCurrency: "CAD",
    defaultTimezone: "America/Toronto",

    checkoutCountryCodes: ["CA"],
    checkoutCountries: buildCountryOptions(["CA"]),
    primaryCountry: "CA",

    shippingCountryErrorMessage:
      "We currently only ship within Canada. Please update your delivery address to continue.",
    shippingNotice: "Shipping available within Canada only.",
    checkoutRegionLabel: "Canada",

    legalRegionLabel: "Canada",
    supportRegionLabel: "Canada",
    policyVariant: "ca",

    siteUrl: envSiteUrl("https://ca.example.com"),
    supportEmail: envSupportEmail(BRAND.supportEmail),

    paymentMethods: ["paypal", "card"],

    legalEntityName: BRAND.legalEntityName,
    legalEntityAddress: BRAND.legalEntityAddress,
    legalEntityCountry: "Australia",
    companyRegistrationNumber: BRAND.companyRegistrationNumber,
    privacyContactEmail: BRAND.privacyContactEmail,
    returnsContactEmail: BRAND.returnsContactEmail,
    governingLawLabel: "Applicable laws governing this Canada storefront",
    supportedCountriesForStorefront: ["CA"],
    returnWindowDaysChangeOfMind: 14,
    hasEuWithdrawalRight: false,
    cookieConsentMode: "optional_settings_only",
  },
};