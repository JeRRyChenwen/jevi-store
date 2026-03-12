// src/app/(shop)/checkout/shipping-quote.ts

import type { DeliveryMethod } from "./types";

export type ShippingQuoteAPIResult = {
  ok: boolean;

  zone_code?: string;
  zone_id?: number;
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
    country: String(args.country || "").trim() || "AU",
    state: String(args.state || "").trim() || null,
    postcode: String(args.postcode || "").trim() || null,
    items_total_minor: Number(args.itemsMinor) || 0,
  };
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
    };
  }

  return data as ShippingQuoteAPIResult;
}