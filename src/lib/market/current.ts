// src/lib/market/current.ts
import { STOREFRONT_CONFIGS } from "./config";
import type {
  PaymentMethodCode,
  StorefrontCode,
  StorefrontConfig,
} from "./types";

function normalizeStorefrontCode(input?: string | null): StorefrontCode {
  const v = String(input || "").trim().toUpperCase();

  if (v === "AU") return "AU";
  if (v === "NZ") return "NZ";
  if (v === "EU") return "EU";
  if (v === "US") return "US";
  if (v === "CA") return "CA";

  return "AU";
}

/**
 * ✅ 当前 storefront code
 * 现在先优先读 storefront 环境变量；
 * 如果以后你想升级成按 host 自动识别（例如 au.xxx.com / nz.xxx.com），
 * 我们再在这里继续扩展。
 */
export function getCurrentStorefrontCode(): StorefrontCode {
  return normalizeStorefrontCode(
    process.env.NEXT_PUBLIC_STOREFRONT_CODE ||
      process.env.STOREFRONT_CODE ||
      null
  );
}

/**
 * ✅ 当前 storefront 配置
 */
export function getCurrentStorefront(): StorefrontConfig {
  return STOREFRONT_CONFIGS[getCurrentStorefrontCode()];
}

/**
 * ✅ 按 storefront code 取 storefront 配置
 */
export function getStorefrontByCode(code?: string | null): StorefrontConfig {
  return STOREFRONT_CONFIGS[normalizeStorefrontCode(code)];
}

/**
 * ✅ storefront 的默认展示币种
 */
export function getEffectiveCurrency(
  storefront: StorefrontConfig = getCurrentStorefront()
) {
  return storefront.defaultCurrency;
}

/**
 * ✅ storefront 的可用支付方式
 * 若 storefront 没显式配置，则回退到默认 ["paypal", "card"]。
 */
export function getEffectivePaymentMethods(
  storefront: StorefrontConfig = getCurrentStorefront()
): readonly PaymentMethodCode[] {
  return storefront.paymentMethods ?? ["paypal", "card"];
}

/**
 * ✅ storefront 的配送范围提示文案
 */
export function getShippingNotice(
  storefront: StorefrontConfig = getCurrentStorefront()
): string {
  return storefront.shippingNotice;
}

/**
 * ✅ 当前 storefront 常量
 */
export const CURRENT_STOREFRONT = getCurrentStorefront();