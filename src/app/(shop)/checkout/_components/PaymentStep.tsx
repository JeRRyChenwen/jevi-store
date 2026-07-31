// D:\前端练习\jevi-store\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Check } from "lucide-react";
import type { PayError } from "./PaymentStep.helpers";
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

function useCheckoutResponsiveLayout() {
  const [layoutReady, setLayoutReady] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const syncLayout = () => {
      setIsDesktopLayout(mediaQuery.matches);
      setLayoutReady(true);
    };

    syncLayout();

    mediaQuery.addEventListener("change", syncLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncLayout);
    };
  }, []);

  return {
    layoutReady,
    isDesktopLayout,
  };
}

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
  onPaySucceeded,
  cart,
  preReservationId,
  preReservationExpiresAtSec,
  preReservationCartHash,
  preReserveLoading,
  preReserveError,
  paypalConsentRequired = false,
  paypalDisabledText,
}) => {
  const { layoutReady, isDesktopLayout } = useCheckoutResponsiveLayout();

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

  /**
   * PayPal capture 和后端建单成功后的组件级处理。
   *
   * PaymentStep 只负责清理本组件的 reservation UI 状态，
   * 然后把完整成功 payload 交还给 Checkout page。
   *
   * Checkout page 是唯一负责以下操作的位置：
   * - 发送 GA4 purchase；
   * - 保存 last-order-preview；
   * - 清空购物袋；
   * - 处理订阅；
   * - 跳转订单确认页。
   */
  const handlePaySucceeded = useCallback(
    async (payload: any) => {
      setPayError(null);
      setSuppressBlockedHint(true);

      setReservationId(null);
      setReservationExpiresAt(null);
      reservationIdRef.current = null;

      try {
        await Promise.resolve(onPaySucceeded(payload));
      } catch (error) {
        console.error("[payment] checkout success finalization failed:", error);

        setPayError(mapPayFailure(error));
      }
    },
    [onPaySucceeded],
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
        {layoutReady && !isDesktopLayout ? (
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
        ) : null}

        {layoutReady && isDesktopLayout ? (
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
        ) : null}
      </div>
    </section>
  );
};

export default PaymentStep;
