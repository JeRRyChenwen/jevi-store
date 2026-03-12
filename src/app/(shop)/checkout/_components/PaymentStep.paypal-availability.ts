// src/app/(shop)/checkout/_components/PaymentStep.paypal-availability.ts

import type { PayError } from "./PaymentStep.helpers";

type Params = {
  visible: boolean;
  isPayProcessing: boolean;
  preReserveLoading?: boolean;
  payBlockedReason: string | null;
  payError: PayError | null;
};

export function getPayPalUnavailable({
  visible,
  isPayProcessing,
  preReserveLoading = false,
  payBlockedReason,
  payError,
}: Params): boolean {
  if (!visible) return true;

  // 正在处理支付时，也应该不可点
  if (isPayProcessing) return true;

  // reserve 正在跑：保持不可点
  if (preReserveLoading) return true;

  // bag / address / total / reservation 等阻断原因
  if (payBlockedReason) return true;

  // 关键错误：直接禁用 PayPal
  if (payError?.type === "out_of_stock") return true;
  if (payError?.type === "reservation_expired") return true;
  if (payError?.type === "reservation_failed") return true;
  if (payError?.type === "amount_mismatch") return true;
  if (payError?.type === "server_error") return true;

  return false;
}