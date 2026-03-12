// src/app/(shop)/checkout/checkout-derived-state.ts
import type { StepKey } from "./types";
import { isStepKey } from "./stepper";
import { buildCartHash, cartToReserveItems } from "./reserve-helpers";
import { buildQuoteReqKey } from "./shipping-quote";

export function coerceCheckoutStep(value: string | null | undefined, fallback: StepKey = "bag"): StepKey {
  return isStepKey(value) ? (value as StepKey) : fallback;
}

export function getCheckoutQuoteReqKey({
  hasItems,
  itemsMinor,
  country,
  state,
  postcode,
}: {
  hasItems: boolean;
  itemsMinor: number;
  country?: string | null;
  state?: string | null;
  postcode?: string | null;
}) {
  return buildQuoteReqKey({
    hasItems: !!hasItems,
    itemsMinor: Number(itemsMinor) || 0,
    country,
    state,
    postcode,
  });
}

export function getCheckoutCartHash({
  hasItems,
  cart,
}: {
  hasItems: boolean;
  cart: any[];
}) {
  if (!hasItems) return "";

  const items = cartToReserveItems(cart);
  if (!items.length) return "";

  return buildCartHash(items);
}