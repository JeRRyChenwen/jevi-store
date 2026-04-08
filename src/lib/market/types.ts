// src/lib/market/types.ts
import type { CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";

/**
 * ✅ storefront = 用户实际访问到的前台站点单元
 * 它可以是国家站，也可以是区域站。
 *
 * 例如：
 * - AU / NZ / US / CA = 国家 storefront
 * - EU = 区域 storefront
 *
 * 后面如果你未来决定把 EU 再拆成 DE / FR / IT，也可以继续补。
 */
export type StorefrontCode =
  | "AU"
  | "NZ"
  | "US"
  | "CA"
  | "EU"
  | "DE"
  | "FR"
  | "IT"
  | "ES"
  | "NL"
  | "BE";

/**
 * ✅ storefront 级 policy variant
 * 以后 policy 页面、页脚文案、邮件里的链接与帮助信息，
 * 都优先看 storefront。
 */
export type StorefrontPolicyVariant =
  | "au"
  | "nz"
  | "us"
  | "ca"
  | "eu"
  | "de"
  | "fr"
  | "it"
  | "es"
  | "nl"
  | "be";

export type PaymentMethodCode = "paypal" | "card";

/**
 * ✅ storefront 层：
 * 这才是前台真正应该读的配置。
 * 前端不再以 market 作为主驱动类型。
 */
export type StorefrontConfig = {
  /**
   * ✅ storefront 自己的 code
   * 例如 AU / NZ / EU
   */
  code: StorefrontCode;

  /**
   * ✅ storefront 对应的主国家
   *
   * 对国家 storefront 来说，一般就是它自己：
   * - AU storefront -> AU
   * - NZ storefront -> NZ
   *
   * 对区域 storefront（例如 EU）来说，
   * 这里先保留为一个默认国家，用于默认地址 / 默认文案 / 默认回退逻辑。
   */
  countryCode: CountryCode;

  /**
   * ✅ 展示名
   */
  label: string;

  /**
   * ✅ storefront 默认币种 / 时区
   */
  defaultCurrency: Currency;
  defaultTimezone: string;

  /**
   * ✅ storefront checkout 允许选择的国家
   * 你当前阶段建议：
   * - AU storefront 只允许 AU
   * - NZ storefront 只允许 NZ
   * - EU storefront 未来可允许多个 EU 国家
   */
  checkoutCountryCodes: readonly CountryCode[];
  checkoutCountries: readonly { code: CountryCode; label: string }[];

  /**
   * ✅ storefront 首选国家
   * 对国家 storefront 来说一般与 countryCode 一致。
   * 对区域 storefront 来说，是一个默认回退国家。
   */
  primaryCountry: CountryCode;

  /**
   * ✅ storefront 级文案
   */
  shippingCountryErrorMessage: string;
  checkoutRegionLabel: string;
  legalRegionLabel: string;
  supportRegionLabel: string;

  /**
   * ✅ storefront 级 policy variant
   */
  policyVariant: StorefrontPolicyVariant;

  /**
   * ✅ storefront 对外链接 / 支持邮箱
   */
  siteUrl: string;
  supportEmail: string;

  /**
   * ✅ storefront 支持哪些支付方式
   */
  paymentMethods?: readonly PaymentMethodCode[];
};