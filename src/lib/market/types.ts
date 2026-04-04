// src/lib/market/types.ts
import type { CountryCode } from "@/lib/country";
import type { Currency } from "@/lib/pricing";

export type MarketCode = "AU_NZ" | "EU" | "US_CA";

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

export type MarketPolicyVariant = "au_nz" | "eu" | "us_ca";

/**
 * ✅ storefront 级 policy variant
 * 以后 policy 页面、页脚文案、邮件里的链接与帮助信息，
 * 都更应该优先看 storefront，而不是只看 market。
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
 * ✅ market 层：
 * 只表达“运营分组”的共性，不再承载 storefront 的展示细节。
 */
export type MarketConfig = {
  code: MarketCode;
  label: string;

  /**
   * ✅ 当前 market 的默认币种
   * storefront 没显式覆盖时可回退到这里
   */
  defaultCurrency: Currency;

  /**
   * ✅ 当前 market 的默认时区
   */
  defaultTimezone: string;

  /**
   * ✅ 当前 market 的默认政策 variant
   * 主要给旧逻辑 / 回退逻辑使用
   */
  policyVariant: MarketPolicyVariant;

  /**
   * ✅ 当前 market 的默认支持信息
   * storefront 没单独覆盖时可回退
   */
  siteUrl: string;
  supportEmail: string;

  /**
   * ✅ 当前 market 下允许挂哪些 storefront
   * 例如：
   * - AU_NZ -> ["AU", "NZ"]
   * - US_CA -> ["US", "CA"]
   * - EU    -> ["EU"]
   */
  storefrontCodes: readonly StorefrontCode[];
};

/**
 * ✅ storefront 层：
 * 这才是前台真正应该读的配置。
 */
export type StorefrontConfig = {
  /**
   * ✅ storefront 自己的 code
   * 例如 AU / NZ / EU
   */
  code: StorefrontCode;

  /**
   * ✅ 它归属哪个 market
   * 例如：
   * - AU -> AU_NZ
   * - NZ -> AU_NZ
   * - EU -> EU
   */
  marketCode: MarketCode;

  /**
   * ✅ storefront 对应的主国家
   *
   * 对国家 storefront 来说，一般就是它自己：
   * - AU storefront -> AU
   * - NZ storefront -> NZ
   *
   * 对区域 storefront（例如 EU）来说，
   * 这里先保留为一个默认国家，用于默认地址 / 默认文案 / 默认回退逻辑。
   * 具体值我们下一步在 config.ts 里再定。
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