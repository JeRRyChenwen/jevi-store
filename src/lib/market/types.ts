// src/lib/market/types.ts
import type { CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";

export type MarketCode = "AU_NZ" | "EU" | "US_CA";

export type MarketPolicyVariant = "au_nz" | "eu" | "us_ca";

export type PaymentMethodCode = "paypal" | "card";

export type MarketCountryOverride = {
  /**
   * ✅ 国家展示名覆盖（通常不需要，预留）
   */
  label?: string;

  /**
   * ✅ 国家级货币覆盖
   * 例如未来 US_CA 里：
   * - US -> USD
   * - CA -> CAD
   */
  currency?: Currency;

  /**
   * ✅ 国家级支付方式覆盖
   * 例如未来某些国家只允许 paypal / card
   */
  paymentMethods?: readonly PaymentMethodCode[];

  /**
   * ✅ 国家级 shipping / delivery 文案覆盖
   */
  shippingRegionLabel?: string;
  taxLabel?: string;
  returnsPolicyLabel?: string;
};

export type MarketConfig = {
  code: MarketCode;
  label: string;

  /**
   * ✅ 当前市场默认展示币种
   */
  defaultCurrency: Currency;

  /**
   * ✅ 当前市场默认时区
   * 先给前端 / 邮件 / 后端统一 contract 用
   */
  defaultTimezone: string;

  /**
   * ✅ 当前市场 checkout 允许选择的国家
   */
  checkoutCountryCodes: readonly CountryCode[];
  checkoutCountries: readonly { code: CountryCode; label: string }[];

  /**
   * ✅ 当前市场首选国家
   */
  primaryCountry: CountryCode;

  /**
   * ✅ 当前市场统一文案
   */
  shippingCountryErrorMessage: string;
  checkoutRegionLabel: string;

  /**
   * ✅ 法律 / 支持 / policy 维度文案
   * 后续 policy 页面、邮件 footer、帮助中心都可以直接读这些字段
   */
  legalRegionLabel: string;
  supportRegionLabel: string;
  policyVariant: MarketPolicyVariant;

  /**
   * ✅ 当前 market 对外链接 / 支持邮箱
   * 后续 mailer-api 也建议对齐这两个字段
   */
  siteUrl: string;
  supportEmail: string;

  /**
   * ✅ 一级 market 下的二级国家覆盖
   */
  countryOverrides?: Partial<Record<CountryCode, MarketCountryOverride>>;
};