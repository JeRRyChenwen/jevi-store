// D:\前端练习\jevi-store\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  pickCreatedOrderIdFromPayPalPayload,
  type PayError,
} from "./PaymentStep.helpers";
import type { PaymentStepProps } from "./PaymentStep.types";
import { getOutOfStockDisplay, mapPayFailure } from "./PaymentStep.error-utils";
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
  shouldPreparePayPal = visible,
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
  paypalConsentRequired = false,
  paypalDisabledText,
}) => {
  const router = useRouter();

  const [method, setMethod] = useState<"card" | "paypal">("paypal");
  const [suppressBlockedHint, setSuppressBlockedHint] = useState(false);

  // 缺货/失败等错误
  const [payError, setPayError] = useState<PayError | null>(null);

  // ✅ Phase 2: reservation state
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<
    number | null
  >(null);

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

  const { reservationSecondsLeft, reservationExpired, payBlockedReason } =
    usePaymentReservationState({
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

  const uiPayBlockedReason = paypalConsentRequired ? null : payBlockedReason;

  // ✅ PayPal 按钮可用性逻辑已抽到独立 util
  const paypalUnavailable = useMemo(() => {
    if (paypalConsentRequired) return true;

    return getPayPalUnavailable({
      visible,
      isPayProcessing,
      preReserveLoading,
      payBlockedReason: uiPayBlockedReason,
      payError,
    });
  }, [
    visible,
    isPayProcessing,
    preReserveLoading,
    uiPayBlockedReason,
    payError,
    paypalConsentRequired,
  ]);

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

      // ✅ 优先使用订单号，例如 SP20260528-000001
      // 这样 confirmation page 可以直接按 order_number 查询订单。
      const orderNumber =
        payload?.order?.order?.order_number ||
        payload?.order?.orderNumber ||
        payload?.order?.order_number ||
        payload?.orderNumber ||
        payload?.successMeta?.orderNumber ||
        null;

      // ✅ 兜底：如果拿不到订单号，再使用数字 id
      const createdOrderId = pickCreatedOrderIdFromPayPalPayload(payload);

      const finalOrderId = String(orderNumber || createdOrderId || "").trim();

      // ✅ confirmation page 读取订单需要 email。
      // 优先使用当前 PaymentStep 已经计算好的 effectiveOrderEmail。
      const finalOrderEmail = String(
        effectiveOrderEmail ||
          payload?.successMeta?.checkoutEmail ||
          payload?.successMeta?.accountEmail ||
          payload?.successMeta?.email ||
          payload?.successMeta?.address?.email ||
          "",
      )
        .trim()
        .toLowerCase();

      if (finalOrderId) {
        const url = new URL("/order/confirmation", window.location.origin);
        url.searchParams.set("orderId", finalOrderId);

        if (finalOrderEmail) {
          url.searchParams.set("email", finalOrderEmail);
        }

        router.replace(`${url.pathname}${url.search}`);
        return;
      }

      // 拿不到 orderId 也至少跳过去（会停在 Finalizing）
      router.replace(`/order/confirmation`);
    },
    [router, effectiveOrderEmail],
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
      className="rounded-2xl border bg-white min-h-0 md:min-h-[720px] flex flex-col overflow-hidden"
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
      <div className="px-4 py-4 md:px-4 md:py-3 border-b flex items-center justify-between">
        <div>
          <div className="text-[18px] md:text-base font-semibold text-neutral-900">
            Payment Options
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <Check className="w-4 h-4" />
          <span>Secure checkout</span>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-3 md:space-y-2 flex flex-col md:flex-1">
        <PaymentStepAddressNotice />

        <PaymentStepStatusAlerts
          visible={visible}
          payError={payError}
          outOfStockDisplay={outOfStockDisplay}
          preReserveLoading={preReserveLoading}
          payBlockedReason={uiPayBlockedReason}
        />

        {/* =========================
           手机端：先支付方式，再订单摘要（含支付按钮），地址放后面
           桌面端：保持你原来的双栏逻辑
        ========================== */}
        <div className="md:hidden space-y-4">
          <PaymentStepMethodPanel method={method} setMethod={setMethod} />

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
                shouldPrepare={shouldPreparePayPal}
                derivedAmountMajor={derivedAmountMajor}
                safeCurrency={safeCurrency}
                isPayProcessing={isPayProcessing}
                preReserveLoading={preReserveLoading}
                paypalUnavailable={paypalUnavailable}
                paypalConsentRequired={paypalConsentRequired}
                paypalDisabledText={paypalDisabledText}
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

          <div className="pt-1 px-1 space-y-1 text-xs text-gray-500">
            <p>
              All charges are processed in <b>{safeCurrency}</b>. Your bank or
              PayPal may apply currency conversion and fees.
            </p>
          </div>
        </div>

        <div className="hidden md:flex md:flex-col md:flex-1">
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
            <PaymentStepMethodPanel method={method} setMethod={setMethod} />

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
                  shouldPrepare={shouldPreparePayPal}
                  derivedAmountMajor={derivedAmountMajor}
                  safeCurrency={safeCurrency}
                  isPayProcessing={isPayProcessing}
                  preReserveLoading={preReserveLoading}
                  paypalUnavailable={paypalUnavailable}
                  paypalConsentRequired={paypalConsentRequired}
                  paypalDisabledText={paypalDisabledText}
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

          <div className="mt-4 pt-4 md:mt-auto md:pt-6 space-y-1 text-xs text-gray-500">
            <p>
              All charges are processed in <b>{safeCurrency}</b>. Your bank or
              PayPal may apply currency conversion and fees.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentStep;
