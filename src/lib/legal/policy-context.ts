// src/lib/legal/policy-context.ts
import { BRAND } from "@/lib/brand";
import { CURRENT_MARKET, getCountryOverride } from "@/lib/market/current";

export function getPolicyContext() {
  const market = CURRENT_MARKET;

  const supportEmail = market.supportEmail || BRAND.supportEmail;
  const siteUrl = market.siteUrl || BRAND.siteUrl;

  const legalRegionLabel = market.legalRegionLabel || market.label;
  const checkoutRegionLabel = market.checkoutRegionLabel || market.label;
  const supportRegionLabel = market.supportRegionLabel || market.label;

  const isAuNz = market.policyVariant === "au_nz";
  const isEu = market.policyVariant === "eu";
  const isUsCa = market.policyVariant === "us_ca";

  const auOverride = getCountryOverride("AU", market);
  const nzOverride = getCountryOverride("NZ", market);

  return {
    market,
    supportEmail,
    siteUrl,

    legalRegionLabel,
    checkoutRegionLabel,
    supportRegionLabel,

    isAuNz,
    isEu,
    isUsCa,

    auTaxLabel: auOverride?.taxLabel || "GST where applicable",
    nzTaxLabel:
      nzOverride?.taxLabel || "Taxes and duties may vary by destination",

    auReturnsPolicyLabel:
      auOverride?.returnsPolicyLabel || "Australia returns policy",
    nzReturnsPolicyLabel:
      nzOverride?.returnsPolicyLabel || "New Zealand returns policy",
  };
}