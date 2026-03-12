// src/app/(shop)/checkout/checkout-pay-success.ts
import type { DeliveryMethod } from "./types";
import type { ShippingQuoteAPIResult } from "./shipping-quote";

type Params = {
  payload?: any;
  currency: string;
  itemsMinor: number;
  deliveryFeeMinorEffective: number;
  totalMinorEffective: number;
  cart: any[];
  address: any;
  deliveryMethod: DeliveryMethod;
  quoteByMethod: Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>;
  lastQuoteMeta: any | null;
  clearCart: () => void;
  sendSubscriptionIfNeeded: () => Promise<void> | void;
  confirmPath: string;
  replaceToConfirm: (path: string) => void;
};

export async function finalizeCheckoutPaySuccess({
  payload,
  currency,
  itemsMinor,
  deliveryFeeMinorEffective,
  totalMinorEffective,
  cart,
  address,
  deliveryMethod,
  quoteByMethod,
  lastQuoteMeta,
  clearCart,
  sendSubscriptionIfNeeded,
  confirmPath,
  replaceToConfirm,
}: Params): Promise<{ ok: true } | { ok: false; error: string }> {
  const checkoutTotals = payload?.successMeta?.checkoutTotals ?? null;

  const currencyForPreview = (checkoutTotals?.currency || currency) as string;

  const itemsMinorForPreview =
    typeof checkoutTotals?.items_total_minor === "number"
      ? Number(checkoutTotals.items_total_minor)
      : Number(itemsMinor) || 0;

  const deliveryFeeMinorForPreview =
    typeof checkoutTotals?.delivery_fee_minor === "number"
      ? Number(checkoutTotals.delivery_fee_minor)
      : Number(deliveryFeeMinorEffective) || 0;

  const totalMinorForPreview =
    typeof checkoutTotals?.total_minor === "number"
      ? Number(checkoutTotals.total_minor)
      : Number(totalMinorEffective) || 0;

  const cartForPreview =
    Array.isArray(checkoutTotals?.items) && checkoutTotals.items.length
      ? checkoutTotals.items
      : cart;

  const orderResp = payload?.order ?? null;

  const createdOrder =
    orderResp?.order?.order ??
    orderResp?.order ??
    orderResp?.data?.order ??
    orderResp?.result?.order ??
    null;

  const orderId: number | null =
    createdOrder && typeof createdOrder.id === "number" ? createdOrder.id : null;

  const orderNumber: string | null =
    createdOrder && (typeof createdOrder.order_number === "string" || createdOrder.order_number == null)
      ? (createdOrder.order_number ?? null)
      : null;

  if (!orderId) {
    return {
      ok: false,
      error: "We couldn’t finalize your order right now. If you were charged, contact support.",
    };
  }

  try {
    sessionStorage.setItem(
      "last-order-preview",
      JSON.stringify({
        ts: Date.now(),
        orderId,
        orderNumber,

        currency: currencyForPreview,
        totalMinor: totalMinorForPreview,

        items: cartForPreview,
        address: { ...address },
        deliveryMethod,

        quote: quoteByMethod?.[deliveryMethod]?.ok
          ? quoteByMethod[deliveryMethod]
          : (lastQuoteMeta ?? null),

        payload: {
          order: { id: orderId, order_number: orderNumber ?? null },
          payment: payload ?? null,
          checkoutTotals: checkoutTotals ?? null,
        },
      })
    );
  } catch {}

  clearCart();

  try {
    await sendSubscriptionIfNeeded();
  } catch {}

  try {
    replaceToConfirm(confirmPath);
  } catch {}

  setTimeout(() => {
    try {
      if (typeof window !== "undefined" && window.location?.pathname !== confirmPath) {
        window.location.replace(confirmPath);
      }
    } catch {}
  }, 50);

  return { ok: true };
}