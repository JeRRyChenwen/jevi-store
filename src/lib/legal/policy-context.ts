// src/lib/legal/policy-context.ts
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";

export function getPolicyContext() {
  const storefront = CURRENT_STOREFRONT;

  const supportEmail = storefront.supportEmail || BRAND.supportEmail;
  const siteUrl = storefront.siteUrl || BRAND.siteUrl;

  const legalRegionLabel = storefront.legalRegionLabel || storefront.label;
  const checkoutRegionLabel =
    storefront.checkoutRegionLabel || storefront.label;
  const supportRegionLabel = storefront.supportRegionLabel || storefront.label;

  const isAu = storefront.policyVariant === "au";
  const isNz = storefront.policyVariant === "nz";
  const isEu = storefront.policyVariant === "eu";
  const isUs = storefront.policyVariant === "us";
  const isCa = storefront.policyVariant === "ca";

  const legalEntityName =
    storefront.legalEntityName || BRAND.legalEntityName;
  const legalEntityAddress =
    storefront.legalEntityAddress || BRAND.legalEntityAddress;
  const legalEntityCountry =
    storefront.legalEntityCountry || BRAND.legalEntityCountry;
  const companyRegistrationNumber =
    storefront.companyRegistrationNumber || BRAND.companyRegistrationNumber;

  const privacyContactEmail =
    storefront.privacyContactEmail || BRAND.privacyContactEmail;
  const returnsContactEmail =
    storefront.returnsContactEmail || BRAND.returnsContactEmail;

  const governingLawLabel =
    storefront.governingLawLabel || BRAND.governingLawLabel;

  const supportedCountriesForStorefront =
    storefront.supportedCountriesForStorefront ||
    storefront.checkoutCountryCodes;

  const returnWindowDaysChangeOfMind =
    storefront.returnWindowDaysChangeOfMind ?? 14;

  const hasEuWithdrawalRight =
    storefront.hasEuWithdrawalRight ?? isEu;

  const cookieConsentMode =
    storefront.cookieConsentMode ||
    (isEu ? "eu_strict" : "optional_settings_only");

  return {
    storefront,
    supportEmail,
    siteUrl,

    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,

    legalEntityName,
    legalEntityAddress,
    legalEntityCountry,
    companyRegistrationNumber,
    privacyContactEmail,
    returnsContactEmail,
    governingLawLabel,
    supportedCountriesForStorefront,
    returnWindowDaysChangeOfMind,
    hasEuWithdrawalRight,
    cookieConsentMode,

    isAu,
    isNz,
    isEu,
    isUs,
    isCa,

    auTaxLabel: "GST where applicable",
    nzTaxLabel: "GST where applicable",

    auReturnsPolicyLabel: "Australia returns policy",
    nzReturnsPolicyLabel: "New Zealand returns policy",
  };
}