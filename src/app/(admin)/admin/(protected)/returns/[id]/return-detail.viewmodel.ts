// src/app/(admin)/admin/(protected)/returns/[id]/return-detail.viewmodel.ts

import type { ReturnRow } from "./return-detail.types";
import { formatMoney } from "./return-detail.utils";

export function buildReturnDetailViewModel(record: ReturnRow | null) {
  const statusLower = String(record?.status || "").toLowerCase();

  const isPending = statusLower === "pending";
  const isApproved = statusLower === "approved";
  const isRejected = statusLower === "rejected";
  const isRefunded = statusLower === "refunded";

  const requestedAmountText = formatMoney(
    record?.requested_amount_minor,
    record?.currency
  );

  const itemsAmountText = formatMoney(
    record?.items_amount_minor,
    record?.currency
  );

  const deliveryFeeText = formatMoney(
    record?.delivery_fee_minor,
    record?.currency
  );

  const approvedAmountText = formatMoney(
    record?.approved_amount_minor,
    record?.currency
  );

  const refundedAmountText = formatMoney(
    record?.refunded_amount_minor,
    record?.currency
  );

  const hasApprovedAmount = typeof record?.approved_amount_minor === "number";
  const hasRefundedAmount = typeof record?.refunded_amount_minor === "number";
  const hasRequestedAmount = typeof record?.requested_amount_minor === "number";
  const hasDeliveryFee = typeof record?.delivery_fee_minor === "number";
  const hasItemsAmount = typeof record?.items_amount_minor === "number";
  const hasRefundError = Boolean(record?.refund_error);

  return {
    statusLower,
    isPending,
    isApproved,
    isRejected,
    isRefunded,

    requestedAmountText,
    itemsAmountText,
    deliveryFeeText,
    approvedAmountText,
    refundedAmountText,

    hasApprovedAmount,
    hasRefundedAmount,
    hasRequestedAmount,
    hasDeliveryFee,
    hasItemsAmount,
    hasRefundError,
  };
}