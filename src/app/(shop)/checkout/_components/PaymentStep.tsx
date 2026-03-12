// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  pickCreatedOrderIdFromPayPalPayload,
  type PayError,
} from "./PaymentStep.helpers";
import type { PaymentStepProps } from "./PaymentStep.types";
import {
  getOutOfStockDisplay,
  mapPayFailure,
} from "./PaymentStep.error-utils";
import { buildCheckoutTotalsMeta } from "./PaymentStep.checkout-meta";
import { buildPaymentSuccessMeta } from "./PaymentStep.success-meta";
import { getPayPalUnavailable } from "./PaymentStep.paypal-availability";
import PaymentStepAddressNotice from "./PaymentStepAddressNotice";
import PaymentStepMethodPanel from "./PaymentStepMethodPanel";
import PaymentStepStatusAlerts from "./PaymentStepStatusAlerts";
import PaymentStepSummaryPanel from "./PaymentStepSummaryPanel";
import PaymentStepPayAction from "./PaymentStepPayAction";
import { usePaymentDerivedState } from "./usePaymentDerivedState";
import { usePaymentReservationState } from "./usePaymentReservationState";
import { usePaymentPreflight } from "./usePaymentPreflight";
import { usePaymentReservationLifecycle } from "./usePaymentReservationLifecycle";


const PaymentStep: React.FC<PaymentStepProps> = ({
  visible,
  isPayProcessing,
  isLoggedIn,
  accountEmail,
  address,
  deliveryMethod,
  deliveryFeeMinor,
  currency,
  onPayInitiated,
  cart,
  preReservationId,
  preReservationExpiresAtSec,
  preReservationCartHash,
  preReserveLoading,
  preReserveError,
}) => {
  const router = useRouter();

  const [method, setMethod] = useState<"card" | "paypal">("paypal");
  const [suppressBlockedHint, setSuppressBlockedHint] = useState(false);

  // 缺货/失败等错误
  const [payError, setPayError] = useState<PayError | null>(null);

  // ✅ Phase 2: reservation state
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<number | null>(null);

  // ✅ IMPORTANT: this ref must be kept in sync with state
  const reservationIdRef = useRef<string | null>(null);

  const {
    safeCurrency,
    stockItems,
    cartHash,
    derivedItemsCount,
    derivedItemsMinor,
    derivedTotalMinor,
    derivedAmountMajor,
    hasAddress,
    effectiveOrderEmail,
    countryDisplay,
  } = usePaymentDerivedState({
    cart: Array.isArray(cart) ? cart : [],
    currency,
    deliveryFeeMinor,
    isLoggedIn,
    accountEmail,
    address,
  });

  const {
    reservationSecondsLeft,
    reservationExpired,
    payBlockedReason,
  } = usePaymentReservationState({
    visible,
    isPayProcessing,
    suppressBlockedHint,
    payError,

    derivedItemsCount,
    hasAddress: !!hasAddress,
    effectiveOrderEmail,
    isLoggedIn,

    preReserveLoading,
    preReserveError,

    preReservationId,
    preReservationCartHash,
    preReservationExpiresAtSec,

    cartHash,
    derivedTotalMinor,
  });

  // ✅ PayPal 按钮可用性逻辑已抽到独立 util
  const paypalUnavailable = useMemo(() => {
    return getPayPalUnavailable({
      visible,
      isPayProcessing,
      preReserveLoading,
      payBlockedReason,
      payError,
    });
  }, [visible, isPayProcessing, preReserveLoading, payBlockedReason, payError]);



  /**
   * ✅ 缺货展示信息：优先从 cart snapshot 取；找不到再用后端 detail
   * 已抽到独立 helper，避免 PaymentStep.tsx 继续膨胀
   */
  const outOfStockDisplay = useMemo(() => {
    return getOutOfStockDisplay(payError, cart);
  }, [payError, cart]);

  usePaymentReservationLifecycle({
    visible,
    cartHash,

    preReservationId,
    preReservationExpiresAtSec,
    preReservationCartHash,

    reservationId,
    reservationExpiresAt,
    reservationExpired,

    setReservationId,
    setReservationExpiresAt,
    reservationIdRef,
    setPayError,
  });







  const handlePaySucceeded = useCallback(
    (payload: any) => {
      setPayError(null);
      setSuppressBlockedHint(true);

      // 成功后把 reservation 状态清掉（后端 /orders 会 consume）
      setReservationId(null);
      setReservationExpiresAt(null);
      reservationIdRef.current = null;

      // ✅ 关键：支付成功后，直接跳转到 confirmation（只出现 Finalizing）
      const orderId = pickCreatedOrderIdFromPayPalPayload(payload);

      if (orderId) {
        router.replace(`/order/confirmation?orderId=${orderId}`);
        return;
      }

      // 拿不到 orderId 也至少跳过去（会停在 Finalizing）
      router.replace(`/order/confirmation`);
    },
    [router]
  );

  /**
   * ✅ 把错误码 -> UI 文案映射抽到独立 util
   * 这样 PaymentStep.tsx 只保留“接收错误并写入 state”
   */
  const handlePayFailed = useCallback(async (err: any) => {
    setPayError(mapPayFailure(err));
  }, []);

  // ✅ 给后端 /orders 的权威 totals + items snapshot
  // 已抽到独立 util，避免 PaymentStep.tsx 累积大段数据整理逻辑
  const checkoutTotalsMeta = useMemo(() => {
    return buildCheckoutTotalsMeta({
      cart: Array.isArray(cart) ? cart : [],
      safeCurrency,
      derivedItemsCount,
      derivedItemsMinor,
      deliveryFeeMinor: Number(deliveryFeeMinor) || 0,
      derivedTotalMinor,
    });
  }, [
    cart,
    safeCurrency,
    derivedItemsCount,
    derivedItemsMinor,
    deliveryFeeMinor,
    derivedTotalMinor,
  ]);

  /**
   * ✅ Phase 2 preflight
   * 已抽到独立 hook，PaymentStep.tsx 只负责组合
   */
  const { runStockReservePreflight } = usePaymentPreflight({
    stockItems,
    cartHash,

    preReservationId,
    preReservationCartHash,
    preReservationExpiresAtSec,

    reservationId,
    reservationExpiresAt,

    setReservationId,
    setReservationExpiresAt,
    reservationIdRef,
  });

  // ✅ successMeta 已抽到独立 util
  const successMetaWithReservation = useMemo(() => {
    return buildPaymentSuccessMeta({
      checkoutTotalsMeta,
      effectiveOrderEmail,
      accountEmail,
      address,
      deliveryMethod,
      preReservationId,
    });
  }, [
    checkoutTotalsMeta,
    effectiveOrderEmail,
    accountEmail,
    address,
    deliveryMethod,
    preReservationId,
  ]);


  return (
    <section
      className="rounded-xl border bg-white min-h-[720px] flex flex-col"
      aria-hidden={!visible}
      style={
        visible
          ? undefined
          : {
              position: "fixed",
              left: 0,
              bottom: 0,
              width: "300px",
              height: "1px",
              opacity: 0.01,
              pointerEvents: "none",
              zIndex: 0,
            }
      }
    >
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-neutral-900">Payment Options</div>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <Check className="w-4 h-4" />
          <span>Secure checkout</span>
        </div>
      </div>

      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <PaymentStepAddressNotice />

        <PaymentStepStatusAlerts
          visible={visible}
          payError={payError}
          outOfStockDisplay={outOfStockDisplay}
          preReserveLoading={preReserveLoading}
          payBlockedReason={payBlockedReason}
        />

        <div className="flex-1 flex flex-col">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
            <PaymentStepMethodPanel
              method={method}
              setMethod={setMethod}
            />

            <PaymentStepSummaryPanel
              address={address}
              hasAddress={hasAddress}
              countryDisplay={countryDisplay}
              effectiveOrderEmail={effectiveOrderEmail}
              derivedItemsCount={derivedItemsCount}
              derivedItemsMinor={derivedItemsMinor}
              deliveryFeeMinor={Number(deliveryFeeMinor) || 0}
              derivedTotalMinor={derivedTotalMinor}
              safeCurrency={safeCurrency}
              visible={visible}
              reservationId={reservationId}
              reservationSecondsLeft={reservationSecondsLeft}
              payError={payError}
              actionSlot={
                <PaymentStepPayAction
                  visible={visible}
                  derivedAmountMajor={derivedAmountMajor}
                  safeCurrency={safeCurrency}
                  isPayProcessing={isPayProcessing}
                  preReserveLoading={preReserveLoading}
                  paypalUnavailable={paypalUnavailable}
                  successMetaWithReservation={successMetaWithReservation}
                  stockItems={stockItems}
                  runStockReservePreflight={runStockReservePreflight}
                  reservationIdRef={reservationIdRef}
                  setPayError={setPayError}
                  setSuppressBlockedHint={setSuppressBlockedHint}
                  onPayInitiated={onPayInitiated}
                  handlePaySucceeded={handlePaySucceeded}
                  handlePayFailed={handlePayFailed}
                />
              }
            />
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-1 text-xs text-gray-500">
          <p>
            All charges are processed in <b>{safeCurrency}</b>. Your bank or PayPal may apply currency conversion and fees.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PaymentStep;
