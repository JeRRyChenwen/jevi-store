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

  /**
   * PayPalBigButton 的成功 payload 会同时包含：
   *
   * - PayPal orderId；
   * - PayPal capture transactionId；
   * - 后端 capture 响应 raw；
   * - PayPal SDK data。
   *
   * 本地业务订单不能使用顶层 payload.orderId，
   * 因为该字段是 PayPal Order ID，不是数据库订单 ID。
   */
  const payloadSources = [
    payload,
    payload?.raw,
    payload?.data,
    payload?.order,
    payload?.raw?.order,
    payload?.data?.order,
  ].filter(Boolean);

  const orderCandidates = payloadSources.flatMap(
    (source: any) => [
      source?.order?.order?.order,
      source?.order?.order,
      source?.order?.data?.order,
      source?.order?.result?.order,
      source?.order,

      source?.data?.order,
      source?.result?.order,

      source?.created_order,
      source?.createdOrder,
    ],
  );

  /**
   * 只接受真正的本地业务订单：
   *
   * - 有正整数数据库 ID；或
   * - 有 SP... 格式的业务订单号。
   *
   * 这样不会误把 PayPal 的字母数字 orderId 当成本地 orderId。
   */
  const createdOrder =
    orderCandidates.find((candidate: any) => {
      if (
        !candidate ||
        typeof candidate !== "object"
      ) {
        return false;
      }

      const candidateId = Number(
        candidate?.id ??
          candidate?.order_id ??
          candidate?.orderId,
      );

      const candidateOrderNumber = String(
        candidate?.order_number ??
          candidate?.orderNumber ??
          "",
      ).trim();

      return (
        (
          Number.isInteger(candidateId) &&
          candidateId > 0
        ) ||
        Boolean(candidateOrderNumber)
      );
    }) ?? null;

  const checkoutSession =
    payload?.raw?.checkout_session ??
    payload?.raw?.checkoutSession ??
    payload?.data?.checkout_session ??
    payload?.data?.checkoutSession ??
    payload?.checkout_session ??
    payload?.checkoutSession ??
    null;

  const orderIdRaw =
    createdOrder?.id ??
    createdOrder?.order_id ??
    createdOrder?.orderId ??
    checkoutSession?.order_id ??
    checkoutSession?.orderId ??
    null;

  const normalizedOrderId =
    Number(orderIdRaw);

  const orderId: number | null =
    Number.isInteger(normalizedOrderId) &&
    normalizedOrderId > 0
      ? normalizedOrderId
      : null;

  const orderNumberRaw =
    createdOrder?.order_number ??
    createdOrder?.orderNumber ??
    checkoutSession?.order_number ??
    checkoutSession?.orderNumber ??
    payload?.successMeta?.orderNumber ??
    payload?.raw?.order_number ??
    payload?.raw?.orderNumber ??
    null;

  const normalizedOrderNumber =
    String(orderNumberRaw ?? "").trim();

  const orderNumber: string | null =
    normalizedOrderNumber || null;

  if (!orderId) {
    return {
      ok: false,
      error:
        "We couldn’t finalize your order right now. If you were charged, contact support.",
    };
  }

  /**
   * 确认页优先使用业务订单号，例如：
   * SP20260730-000030。
   *
   * 缺少业务订单号时，才回退到数据库数字 ID。
   */
  const confirmationOrderId = String(
    orderNumber || orderId,
  ).trim();

  /**
   * 确认页 URL 只包含订单号。
   *
   * 顾客邮箱仍然保存在 last-order-preview 的 address 和 payment payload 中，
   * 供当前结账会话读取订单使用，但不得放入浏览器 URL。
   */
  const confirmationSearchParams =
    new URLSearchParams();

  confirmationSearchParams.set(
    "orderId",
    confirmationOrderId,
  );

  const confirmationTarget =
    `${confirmPath}?${confirmationSearchParams.toString()}`;

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

  if (
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined"
) {
  console.log(
    "[checkout] bag before clear =",
    window.localStorage.getItem("bag:v1"),
  );
}

clearCart();

if (
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined"
) {
  console.log(
    "[checkout] bag immediately after clear =",
    window.localStorage.getItem("bag:v1"),
  );

  window.setTimeout(() => {
    console.log(
      "[checkout] bag 1 second after clear =",
      window.localStorage.getItem("bag:v1"),
    );
  }, 1000);
}

try {
  await sendSubscriptionIfNeeded();
} catch {}

  try {
    replaceToConfirm(
      confirmationTarget,
    );
  } catch {}

  setTimeout(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.location?.pathname !== confirmPath
      ) {
        window.location.replace(
          confirmationTarget,
        );
      }
    } catch {}
  }, 50);

  return { ok: true };
}