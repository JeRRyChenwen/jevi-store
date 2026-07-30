// src/app/(shop)/checkout/checkout-pay-success.ts
import {
  cartItemToGa4CommerceInput,
  trackPurchase,
  type Ga4CommerceItemInput,
} from "@/lib/analytics/ga4";
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

  const taxMinorForPreview =
    typeof checkoutTotals?.tax_minor === "number"
      ? Number(checkoutTotals.tax_minor)
      : typeof checkoutTotals?.taxMinor === "number"
        ? Number(checkoutTotals.taxMinor)
        : 0;

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
      error:
        "We couldn’t finalize your order right now. If you were charged, contact support.",
    };
  }

  /**
   * GA4 purchase 必须在：
   *
   * 1. PayPal 捕获成功；
   * 2. 后端订单已经持久化；
   * 3. 返回真实 orderId；
   * 4. clearCart 和页面跳转之前；
   *
   * 才能发送。
   */
  const transactionId = String(
    orderNumber || orderId,
  ).trim();

  const purchaseCurrency =
    String(currencyForPreview || "AUD")
      .trim()
      .toUpperCase() || "AUD";

  const analyticsItems = cart
    .map((item) =>
      cartItemToGa4CommerceInput(item),
    )
    .filter(
      (
        item,
      ): item is Ga4CommerceItemInput =>
        item !== null,
    );

  const hasCompleteAnalyticsCart =
    cart.length > 0 &&
    analyticsItems.length === cart.length;

  const purchaseItems = analyticsItems.map(
    (item) => ({
      ...item,
      currency: purchaseCurrency,
    }),
  );

  /**
   * 再次核对前端商品合计与成功订单的权威商品合计。
   *
   * 最多允许 1 cent 的浮点舍入误差。
   * 金额不一致时不发送错误的 purchase revenue。
   */
  const analyticsItemsMinor = Math.round(
    purchaseItems.reduce(
      (sum, item) => {
        const quantity = Math.max(
          1,
          Math.floor(
            Number(item.quantity) || 1,
          ),
        );

        return (
          sum +
          Number(item.price || 0) * quantity
        );
      },
      0,
    ) * 100,
  );

  const expectedItemsMinor = Math.round(
    Number(itemsMinorForPreview) || 0,
  );

  const itemTotalMatches =
    expectedItemsMinor > 0 &&
    Math.abs(
      analyticsItemsMinor -
        expectedItemsMinor,
    ) <= 1;

  if (
    transactionId &&
    hasCompleteAnalyticsCart &&
    itemTotalMatches
  ) {
    trackPurchase({
      transactionId,
      items: purchaseItems,

      shipping:
        Math.max(
          0,
          Math.round(
            Number(
              deliveryFeeMinorForPreview,
            ) || 0,
          ),
        ) / 100,

      tax:
        Math.max(
          0,
          Math.round(
            Number(taxMinorForPreview) || 0,
          ),
        ) / 100,
    });
  } else {
    console.warn(
      "[ga4] purchase event skipped because order analytics data was incomplete or inconsistent",
      {
        transactionId,
        cartLength: cart.length,
        analyticsItemsLength:
          analyticsItems.length,
        expectedItemsMinor,
        analyticsItemsMinor,
        itemTotalMatches,
      },
    );
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