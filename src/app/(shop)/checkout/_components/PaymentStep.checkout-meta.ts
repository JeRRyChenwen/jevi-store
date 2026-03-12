// src/app/(shop)/checkout/_components/PaymentStep.checkout-meta.ts

import { mediaUrl } from "@/lib/strapi";

type BuildCheckoutTotalsMetaParams = {
  cart: any[];
  safeCurrency: string;
  derivedItemsCount: number;
  derivedItemsMinor: number;
  deliveryFeeMinor: number;
  derivedTotalMinor: number;
};

export function buildCheckoutTotalsMeta({
  cart,
  safeCurrency,
  derivedItemsCount,
  derivedItemsMinor,
  deliveryFeeMinor,
  derivedTotalMinor,
}: BuildCheckoutTotalsMetaParams) {
  const itemsSnapshot = (Array.isArray(cart) ? cart : []).map((it) => {
    const qty = Math.max(1, Number(it?.qty) || 1);

    const unitMinor = Math.round((Number(it?.price) || 0) * 100);
    const lineMinor = unitMinor * qty;

    const rawImage =
      it?.image ??
      it?.img ??
      it?.image_url ??
      it?.attrs?.image ??
      it?.attrs?.thumbnail ??
      it?.attrs?.cover ??
      it?.attrs?.images?.[0] ??
      it?.images?.[0] ??
      it?.snapshot?.image ??
      it?.snapshot?.image_url ??
      it?.snapshot?.attrs?.image ??
      null;

    const computedImageUrl = rawImage ? mediaUrl(rawImage) : null;

    const prevSnap = (it as any)?.snapshot ?? {};
    const nextSnap = {
      ...prevSnap,
      image: prevSnap?.image ?? rawImage ?? null,
      image_url: prevSnap?.image_url ?? computedImageUrl ?? null,
      attrs: {
        ...(prevSnap?.attrs ?? {}),
        ...(it as any)?.attrs,
      },
    };

    return {
      ...it,
      qty,
      unit_price_minor: unitMinor,
      line_total_minor: lineMinor,

      image: (it as any)?.image ?? rawImage ?? null,
      image_url: (it as any)?.image_url ?? computedImageUrl ?? null,

      snapshot: nextSnap,
    };
  });

  return {
    pricing_source: "paymentstep-derived",
    currency: safeCurrency,
    items_count: derivedItemsCount,
    items_total_minor: derivedItemsMinor,
    delivery_fee_minor: Number(deliveryFeeMinor) || 0,
    total_minor: derivedTotalMinor,
    items: itemsSnapshot,
  };
}