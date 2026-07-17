// src/app/(shop)/checkout/checkout-delivery-view-model.ts
import { countryLabelOf } from "@/lib/country";
import type { DeliveryMethod } from "./types";
import type { ShippingQuoteAPIResult } from "./shipping-quote";

type QuoteMap = Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>;

type Params = {
  hasItems: boolean;
  itemsMinor: number;
  deliveryMethod: DeliveryMethod;
  quoteByMethod: QuoteMap;
  quoteLoading: boolean;
  quoteError: string | null;
  addressCountry?: string | null;
  currency: string;
};

export function getCheckoutDeliveryViewModel({
  hasItems,
  itemsMinor,
  deliveryMethod,
  quoteByMethod,
  quoteLoading,
  quoteError,
  addressCountry,
  currency,
}: Params) {
  const showFreeShipping =
    hasItems &&
    quoteByMethod?.standard?.ok &&
    typeof quoteByMethod.standard.standard_free_unlocked === "boolean"
      ? !!quoteByMethod.standard.standard_free_unlocked
      : false;

  const standardFreeThresholdMinor =
    quoteByMethod?.standard?.ok &&
    typeof quoteByMethod.standard.standard_free_threshold_minor === "number"
      ? Number(quoteByMethod.standard.standard_free_threshold_minor)
      : null;

  const deliveryFeeMinorByMethod = {
    standard: quoteByMethod?.standard?.ok
      ? Number(quoteByMethod.standard.delivery_fee_minor ?? 0)
      : null,
    express: quoteByMethod?.express?.ok
      ? Number(quoteByMethod.express.delivery_fee_minor ?? 0)
      : null,
  };


  const shippingPromotionByMethod = {
    standard: quoteByMethod?.standard?.ok
      ? {
          unlocked:
            quoteByMethod.standard.shipping_promotion_unlocked === true,

          discountPercent:
            Number(
              quoteByMethod.standard.shipping_discount_percent ?? 0
            ) || 0,

          kind:
            quoteByMethod.standard.shipping_promotion_kind ?? "none",

          reason:
            quoteByMethod.standard.shipping_promotion_reason ?? null,

          thresholdMinor:
            typeof quoteByMethod.standard
              .shipping_promotion_threshold_minor === "number"
              ? Number(
                  quoteByMethod.standard
                    .shipping_promotion_threshold_minor
                )
              : null,

          originalFeeMinor:
            typeof quoteByMethod.standard
              .original_delivery_fee_minor === "number"
              ? Number(
                  quoteByMethod.standard.original_delivery_fee_minor
                )
              : null,

          discountMinor:
            typeof quoteByMethod.standard
              .shipping_discount_minor === "number"
              ? Number(
                  quoteByMethod.standard.shipping_discount_minor
                )
              : null,

          finalFeeMinor:
            typeof quoteByMethod.standard.delivery_fee_minor ===
            "number"
              ? Number(
                  quoteByMethod.standard.delivery_fee_minor
                )
              : null,

          zoneName:
            quoteByMethod.standard.zone_name ?? null,

          zoneType:
            quoteByMethod.standard.zone_type ?? null,

          currency:
            quoteByMethod.standard.currency ?? currency,
        }
      : undefined,

    express: quoteByMethod?.express?.ok
      ? {
          unlocked:
            quoteByMethod.express.shipping_promotion_unlocked === true,

          discountPercent:
            Number(
              quoteByMethod.express.shipping_discount_percent ?? 0
            ) || 0,

          kind:
            quoteByMethod.express.shipping_promotion_kind ?? "none",

          reason:
            quoteByMethod.express.shipping_promotion_reason ?? null,

          thresholdMinor:
            typeof quoteByMethod.express
              .shipping_promotion_threshold_minor === "number"
              ? Number(
                  quoteByMethod.express
                    .shipping_promotion_threshold_minor
                )
              : null,

          originalFeeMinor:
            typeof quoteByMethod.express
              .original_delivery_fee_minor === "number"
              ? Number(
                  quoteByMethod.express.original_delivery_fee_minor
                )
              : null,

          discountMinor:
            typeof quoteByMethod.express
              .shipping_discount_minor === "number"
              ? Number(
                  quoteByMethod.express.shipping_discount_minor
                )
              : null,

          finalFeeMinor:
            typeof quoteByMethod.express.delivery_fee_minor ===
            "number"
              ? Number(
                  quoteByMethod.express.delivery_fee_minor
                )
              : null,

          zoneName:
            quoteByMethod.express.zone_name ?? null,

          zoneType:
            quoteByMethod.express.zone_type ?? null,

          currency:
            quoteByMethod.express.currency ?? currency,
        }
      : undefined,
  };


  const etaByMethod = {
    standard: quoteByMethod?.standard?.ok
      ? {
          eta_min_total: Number(quoteByMethod.standard.eta_min_total ?? 0) || null,
          eta_max_total: Number(quoteByMethod.standard.eta_max_total ?? 0) || null,
          min_days: Number(quoteByMethod.standard.min_days ?? 0) || null,
          max_days: Number(quoteByMethod.standard.max_days ?? 0) || null,
          handling_days: Number(quoteByMethod.standard.handling_days ?? 0) || null,
          warehouse_code: (quoteByMethod.standard.warehouse_code ?? null) as any,
          carrier_service: (quoteByMethod.standard.carrier_service ?? null) as any,
          eta_note: (quoteByMethod.standard.eta_note ?? null) as any,
        }
      : undefined,

    express: quoteByMethod?.express?.ok
      ? {
          eta_min_total: Number(quoteByMethod.express.eta_min_total ?? 0) || null,
          eta_max_total: Number(quoteByMethod.express.eta_max_total ?? 0) || null,
          min_days: Number(quoteByMethod.express.min_days ?? 0) || null,
          max_days: Number(quoteByMethod.express.max_days ?? 0) || null,
          handling_days: Number(quoteByMethod.express.handling_days ?? 0) || null,
          warehouse_code: (quoteByMethod.express.warehouse_code ?? null) as any,
          carrier_service: (quoteByMethod.express.carrier_service ?? null) as any,
          eta_note: (quoteByMethod.express.eta_note ?? null) as any,
        }
      : undefined,
  };

  const countryLabel = addressCountry
    ? countryLabelOf(addressCountry)
    : "Selected country";

  const currencyLabel = String(currency || "").trim().toUpperCase() || "—";

  const quoteMatchedText =
    !quoteLoading && !quoteError && quoteByMethod?.[deliveryMethod]?.ok
      ? `Shipping matched: ${countryLabel} · option ${deliveryMethod} · fee ${(
          (Number(quoteByMethod?.[deliveryMethod]?.delivery_fee_minor ?? 0) || 0) / 100
        ).toFixed(2)} ${currencyLabel}`
      : null;

  return {
    showFreeShipping,
    standardFreeThresholdMinor,
    deliveryFeeMinorByMethod,
    shippingPromotionByMethod,
    itemsMinor,
    etaByMethod,
    quoteMatchedText,
  };
}