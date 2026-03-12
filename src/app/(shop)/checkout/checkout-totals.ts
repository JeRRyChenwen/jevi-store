// src/app/(shop)/checkout/checkout-totals.ts
import type { DeliveryMethod } from "./types";
import type { ShippingQuoteAPIResult } from "./shipping-quote";

type Params = {
  deliveryMethod: DeliveryMethod;
  quoteByMethod: Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>;
  deliveryFeeMinorFallback: number;
  itemsMinor: number;
};

export function getCheckoutTotals({
  deliveryMethod,
  quoteByMethod,
  deliveryFeeMinorFallback,
  itemsMinor,
}: Params) {
  const serverFeeMinorSelected =
    quoteByMethod?.[deliveryMethod]?.ok
      ? Number(quoteByMethod?.[deliveryMethod]?.delivery_fee_minor ?? 0)
      : null;

  const deliveryFeeMinorEffective =
    serverFeeMinorSelected != null ? serverFeeMinorSelected : deliveryFeeMinorFallback;

  const deliveryFeeMajorEffective = deliveryFeeMinorEffective / 100;

  const standardUnlocked =
    quoteByMethod?.standard?.ok &&
    typeof quoteByMethod.standard.standard_free_unlocked === "boolean"
      ? !!quoteByMethod.standard.standard_free_unlocked
      : false;

  const standardFreeThresholdMinor =
    quoteByMethod?.standard?.ok &&
    typeof quoteByMethod.standard.standard_free_threshold_minor === "number"
      ? Number(quoteByMethod.standard.standard_free_threshold_minor)
      : null;

  const discountMinor = 0;
  const taxMinor = 0;

  const totalMinorEffective = Math.max(
    0,
    (Number(itemsMinor) + Number(deliveryFeeMinorEffective) + taxMinor - discountMinor) | 0
  );

  const totalMajorEffective = totalMinorEffective / 100;
  const amountInMajorUnitEffective = totalMajorEffective;

  return {
    serverFeeMinorSelected,
    deliveryFeeMinorEffective,
    deliveryFeeMajorEffective,
    standardUnlocked,
    standardFreeThresholdMinor,
    discountMinor,
    taxMinor,
    totalMinorEffective,
    totalMajorEffective,
    amountInMajorUnitEffective,
  };
}