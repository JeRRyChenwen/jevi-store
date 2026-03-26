// src/app/(shop)/checkout/constants.ts

import type { Currency } from "@/lib/pricing";
import type { StepKey } from "./types";
import { CURRENT_MARKET } from "@/lib/market/current";

/* ---------------- 本地存储 ---------------- */
export const LS_ADDRESS_KEY = "sp.checkout.address";
export const SS_RESERVE_KEY = "sp.checkout.reserve.v1"; // sessionStorage key

/* ---------------- 价格 / 币种 ---------------- */
/**
 * 这些常量可以暂时保留用于 UI fallback，
 * 但 delivery fee 以 server-side quote 为准。
 */
export const DELIVERY_FREE_THRESHOLD = 100;
export const DELIVERY_FLAT = 10;
export const DISPLAY_CURRENCY: Currency = CURRENT_MARKET.defaultCurrency;

/* ---------------- 页面 / 路由 ---------------- */
export const CONFIRM_PATH = "/order/confirmation";

/* ---------------- Reserve 预加载 ---------------- */
// 预加载触发 step：进入这些 step 就开始 reserve
export const SHOULD_PREFETCH_RESERVE_STEPS: StepKey[] = ["address"];

// 去抖：购物车连续变动时，最后一次变动才触发 reserve
export const RESERVE_DEBOUNCE_MS = 700;

// ✅ 修法2：不做续租窗口；只要没过期就复用
export const RESERVE_RENEW_WINDOW_SEC = 0;

/* ---------------- Stepper ---------------- */
export const STEP_LIST: { key: StepKey; label: string }[] = [
  { key: "bag", label: "Bag" },
  { key: "address", label: "Address" },
  { key: "delivery", label: "Delivery" },
  { key: "payment", label: "Payment" },
];