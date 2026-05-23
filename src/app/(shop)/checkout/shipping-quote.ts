// src/app/(shop)/checkout/shipping-quote.ts

import type { DeliveryMethod } from "./types";

export type ShippingZoneType =
  | "tier"
  | "fallback"
  | "custom_rate"
  | "manual_review"
  | "blocked"
  | "exception"
  | "unknown";

export type ShippingAvailability = "available" | "unavailable";

export type ShippingQuoteAPIResult = {
  ok: boolean;

  zone_code?: string;
  zone_id?: number;
  zone_type?: ShippingZoneType;
  shipping_availability?: ShippingAvailability;
  customer_message?: string | null;

  rule_id?: number;
  tier_id?: number;

  currency?: string;
  delivery_fee_minor?: number;

  // ✅ ETA（后端返回）
  min_days?: number;
  max_days?: number;
  handling_days?: number;
  eta_min_total?: number;
  eta_max_total?: number;
  warehouse_code?: string | null;
  carrier_service?: string | null;
  eta_note?: string | null;

  // ✅ 用于前端显示“免运费达标”（以 standard 的 free 规则为准）
  standard_free_unlocked?: boolean;
  standard_free_threshold_minor?: number;

  error?: string;
  message?: string;
  detail?: any;
  status?: number;
};

export function buildQuoteReqKey(args: {
  hasItems: boolean;
  itemsMinor: number;
  country?: string | null;
  state?: string | null;
  postcode?: string | null;
}): string {
  const country = String(args.country || "").trim();
  const state = String(args.state || "").trim();
  const postcode = String(args.postcode || "").trim();

  return JSON.stringify({
    hasItems: !!args.hasItems,
    itemsMinor: Number(args.itemsMinor) || 0,
    country,
    state,
    postcode,
  });
}

export function buildQuoteRequestInput(args: {
  country?: string | null;
  state?: string | null;
  postcode?: string | null;
  itemsMinor: number;
}) {
  return {
    country: String(args.country || "").trim().toUpperCase(),
    state: String(args.state || "").trim() || null,
    postcode: String(args.postcode || "").trim() || null,
    items_total_minor: Number(args.itemsMinor) || 0,
  };
}

export function isShippingQuoteBlockingError(code?: string | null) {
  const normalized = String(code || "").trim();

  return (
    normalized === "shipping_manual_review_required" ||
    normalized === "shipping_blocked_destination" ||
    normalized === "shipping_quote_exception" ||
    normalized === "shipping_quote_unavailable"
  );
}

export function getShippingQuoteDisplayMessage(
  quote: Partial<ShippingQuoteAPIResult> | null | undefined
) {
  const code = String(quote?.error || "").trim();
  const serverMessage = String(quote?.message || "").trim();

  if (serverMessage) return serverMessage;

  if (code === "shipping_manual_review_required") {
    return "Shipping to this postcode requires manual confirmation. Please contact support before placing your order.";
  }

  if (code === "shipping_blocked_destination") {
    return "Sorry, we currently do not ship to this postcode.";
  }

  if (code === "shipping_quote_exception") {
    return "Shipping to this postcode cannot be calculated automatically. Please contact support.";
  }

  if (code === "shipping_quote_unavailable") {
    return "Shipping could not be calculated for this address. Please check your postcode or contact support.";
  }

  return code || "Shipping quote unavailable.";
}

export async function fetchOneQuote(args: {
  remoteBase: string;
  apiURL: (path: string) => string;
  delivery_option: DeliveryMethod;
  country: string;
  state: string | null;
  postcode: string | null;
  items_total_minor: number;
  signal: AbortSignal;
}): Promise<ShippingQuoteAPIResult> {
  // ✅ 本地开发：优先走 d1-worker（NEXT_PUBLIC_API_BASE），避免 /api/shipping/quote 400
  const target = args.remoteBase
    ? `${args.remoteBase}/shipping/quote`
    : args.apiURL("/shipping/quote");

  const res = await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    signal: args.signal,
    body: JSON.stringify({
      country: args.country,
      state: args.state,
      postcode: args.postcode,
      delivery_option: args.delivery_option,
      items_total_minor: args.items_total_minor,
    }),
  });

  const data = (await res.json().catch(() => null)) as any;

  if (!res.ok || !data?.ok) {
    return {
      ok: false,
      error: data?.error || `quote_failed_status_${res.status}`,
      message: data?.message || "",
      detail: data?.detail ?? null,
      status: res.status,
      zone_code: data?.detail?.zone_code ?? data?.zone_code ?? undefined,
      zone_id: data?.detail?.zone_id ?? data?.zone_id ?? undefined,
      zone_type: data?.detail?.zone_type ?? data?.zone_type ?? undefined,
      shipping_availability:
        data?.detail?.shipping_availability ??
        data?.shipping_availability ??
        "unavailable",
      customer_message:
        data?.message ?? data?.customer_message ?? data?.detail?.customer_message ?? null,
    };
  }

  return data as ShippingQuoteAPIResult;
}