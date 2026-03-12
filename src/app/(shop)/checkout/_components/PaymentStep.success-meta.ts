// src/app/(shop)/checkout/_components/PaymentStep.success-meta.ts

type BuildPaymentSuccessMetaParams = {
  checkoutTotalsMeta: any;
  effectiveOrderEmail: string;
  accountEmail?: string | null;
  address: any;
  deliveryMethod: any;
  preReservationId?: string | null;
};

export function buildPaymentSuccessMeta({
  checkoutTotalsMeta,
  effectiveOrderEmail,
  accountEmail,
  address,
  deliveryMethod,
  preReservationId,
}: BuildPaymentSuccessMetaParams) {
  const rid = String(preReservationId || "").trim() || null;

  return {
    checkoutTotals: checkoutTotalsMeta,

    // 给 PayPalBigButton /orders 使用的最终订单邮箱
    checkoutEmail: effectiveOrderEmail || null,

    // 额外保留账户邮箱，作为备用字段
    accountEmail: accountEmail || null,

    address,
    deliveryOption: deliveryMethod,
    meta: {
      pricing_source: "paymentstep-derived",
    },
    reservation_id: rid,
    reservationId: rid,
    inventory_reservation_id: rid,
  };
}