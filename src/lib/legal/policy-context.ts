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

  return {
    storefront,
    supportEmail,
    siteUrl,

    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,

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