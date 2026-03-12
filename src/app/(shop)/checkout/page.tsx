// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageBack from "@/components/PageBack";
import BagStep from "./_components/BagStep";
import AddressStep from "./_components/AddressStep";
import DeliveryStep from "./_components/DeliveryStep";
import PaymentStep from "./_components/PaymentStep";
import CheckoutSteps from "./_components/CheckoutSteps";
import {
  LargeBackButton,
  LargeGhostButton,
  LargePrimaryButton,
} from "./_components/CheckoutButtons";
import { useCart } from "./(hooks)/useCart";
import { usePricing } from "./(hooks)/usePricing";
import { useAddress } from "./(hooks)/useAddress";
import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";
import type {
  DeliveryMethod,
  ReserveCache,
  StepKey,
} from "./types";
import {
  CONFIRM_PATH,
  DELIVERY_FLAT,
  DELIVERY_FREE_THRESHOLD,
  DISPLAY_CURRENCY,
} from "./constants";
import {
  resetReserveForCartHashChange,
  resetReserveForEmptyCart,
} from "./reserve-runtime";
import {
  clearCheckoutReserveLocalState,
  ensureCheckoutReserveBeforeNext,
  prefetchCheckoutReserve,
  releaseCheckoutReservationNow,
  scheduleCheckoutReservePrefetch,
} from "./checkout-reserve-ops";
import {
  attachReserveWindowLifecycle,
  cleanupReserveResources,
  createReserveWindowLifecycleHandlers,
  detachReserveWindowLifecycle,
  shouldReleaseOnRouteLeave,
} from "./reserve-lifecycle";
import {
  getNextCheckoutStep,
  getPrevCheckoutStep,
  setCheckoutStepAndURL,
} from "./checkout-navigation";
import { type ShippingQuoteAPIResult } from "./shipping-quote";
import { getCheckoutTotals } from "./checkout-totals";
import { runCheckoutSubscriptionIfNeeded } from "./checkout-subscription";
import { finalizeCheckoutPaySuccess } from "./checkout-pay-success";
import { getCheckoutDeliveryViewModel } from "./checkout-delivery-view-model";
import { runCheckoutContinue } from "./checkout-continue";
import { fetchCheckoutShippingQuotesBoth } from "./checkout-shipping-request";
import {
  runCheckoutPageBootstrap,
  runCheckoutPagePreconnect,
} from "./checkout-bootstrap-runtime";
import {
  coerceCheckoutStep,
  getCheckoutCartHash,
  getCheckoutQuoteReqKey,
} from "./checkout-derived-state";
import {
  getCheckoutAlertVariant,
  getCheckoutContinueButtonState,
  handleCheckoutLoginAndContinue,
} from "./checkout-page-ui";
import {
  buildCheckoutAddressStepProps,
  buildCheckoutBagStepProps,
  buildCheckoutDeliveryStepProps,
  buildCheckoutPaymentStepProps,
} from "./checkout-step-props";

/* ---------------- 工具：本地 /api 优先（需要远端时单独指定） ---------------- */
const apiURL = (path: string) => `/api${path}`;
const REMOTE_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/* ---------------- Page ---------------- */
export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { cart, setCart, itemsCount, hasItems, clearCart } = useCart();

  // ✅ 统一表单级提示（用于 Continue 下方提示：Bag / Address）
  const formAlert = useFormAlert();

  // 勾选状态
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // 登录态
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ 登录用户专用邮箱（账户邮箱）
  // - 登录用户下单时优先使用这个
  // - 不再强依赖 address.email
  const [accountEmail, setAccountEmail] = useState<string>("");

  // 地址相关全部交给 useAddress
  const {
    address,
    setAddress,
    billingAddress,
    setBillingAddress,
    sameAsDelivery,
    setSameAsDelivery,
    useSavedDelivery,
    setUseSavedDelivery,
    useSavedBilling,
    setUseSavedBilling,
    hasSavedDelivery,
    hasSavedBilling,
    savedDeliveryAddr,
    savedBillingAddr,
    addressShowErrors,
    setAddressShowErrors,
    addressErrs,
    setAddressErrs,
    billingErrs,
    setBillingErrs,
    saveMsg,
    continueErrMsg,
    setContinueErrMsg,
    clearAddressErrors,
    clearBillingErrors,
    handleBillingFieldChange,
    handleSaveDefaultAddress,
  } = useAddress(isLoggedIn);

  useEffect(() => {
    if (continueErrMsg && continueErrMsg.trim()) {
      formAlert.error(continueErrMsg);
      return;
    }
    formAlert.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continueErrMsg]);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [isPayProcessing, setIsPayProcessing] = useState(false);
  const [payPersistErrMsg, setPayPersistErrMsg] = useState<string | null>(null);

  // ===============================
  // ✅ Reserve prefetch state
  // ===============================
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveErr, setReserveErr] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAtSec, setReservationExpiresAtSec] = useState<number | null>(null);
  const [reservationCartHash, setReservationCartHash] = useState<string | null>(null);

  const reserveAbortRef = useRef<AbortController | null>(null);
  const reserveTimerRef = useRef<any>(null);

  // 避免重复打同一个 reserve
  const lastReserveKeyRef = useRef<string>("");
  const lastCartHashRef = useRef<string>("");

  const reservePromiseRef = useRef<Promise<ReserveCache | null> | null>(null);

  const initialStepFromURL = coerceCheckoutStep(searchParams.get("step"), "bag");
  const [step, setStep] = useState<StepKey>(initialStepFromURL);

  // ✅ keep local step state in sync with URL (?step=...)
  const stepParam = searchParams.get("step");
  useEffect(() => {
    const nextStepFromParam = coerceCheckoutStep(stepParam, step);
    if (nextStepFromParam !== step) {
      setStep(nextStepFromParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepParam]);

  const setStepAndURL = (next: StepKey) => {
    setCheckoutStepAndURL({
      next,
      pathname,
      search: window.location.search,
      replace: router.replace,
      setStep,
      setContinueErrMsg,
      setPayPersistErrMsg,
    });
  };

  // ===============================
  // ✅ When leaving /checkout route, release reservation immediately
  // ===============================
  const prevPathRef = useRef<string>("");

  useEffect(() => {
    // 第一次进来初始化
    if (!prevPathRef.current) {
      prevPathRef.current = pathname;
      return;
    }

    const prev = prevPathRef.current;
    const curr = pathname;

    // ✅ 从 /checkout 跳到别的页面：立即释放
    if (shouldReleaseOnRouteLeave(prev, curr)) {
      void releaseReservationNow("leave_checkout_route");
    }

    prevPathRef.current = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    runCheckoutPagePreconnect();
  }, []);

  useEffect(() => {
    const detach = runCheckoutPageBootstrap({
      setAddress,
      setIsLoggedIn,
      setAccountEmail,
    });

    return () => {
      detach();
    };
  }, [setAddress]);

  // 旧 hook 仍然用于 itemsMinor / itemsMajor（delivery fee 下面会用 server quote 覆盖）
  const pricing = usePricing(cart, hasItems, DISPLAY_CURRENCY, DELIVERY_FREE_THRESHOLD, DELIVERY_FLAT);
  const {
    currency,
    itemsMinor,
    itemsMajor,
    savedMajor,
    deliveryFeeMinor: deliveryFeeMinorFallback,
  } = pricing;

  // ===============================
  // ✅ NEW: server-side shipping quote state (fetch BOTH standard + express)
  // ===============================
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [quoteByMethod, setQuoteByMethod] = useState<
    Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>
  >({});
  const [lastQuoteMeta, setLastQuoteMeta] = useState<any | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const quoteReqKey = useMemo(() => {
    return getCheckoutQuoteReqKey({
      hasItems,
      itemsMinor,
      country: address?.country,
      state: address?.state,
      postcode: address?.postcode,
    });
  }, [address?.country, address?.state, address?.postcode, hasItems, itemsMinor]);

  const cartHash = useMemo(() => {
    return getCheckoutCartHash({
      hasItems,
      cart,
    });
  }, [cart, hasItems]);

  // ===============================
  // ✅ Release reservation immediately (leave checkout / close tab / refresh)
  // ===============================
  function clearReserveLocalState() {
    clearCheckoutReserveLocalState({
      setReservationId,
      setReservationExpiresAtSec,
      setReservationCartHash,
      setReserveErr,
      setReserveLoading,
      reservePromiseRef,
      lastReserveKeyRef,
    });
  }

  async function releaseReservationNow(reason: string) {
    await releaseCheckoutReservationNow({
      reason,
      reservationId,
      apiURL,
      reserveAbortRef,
      clearReserveLocalState,
    });
  }

  // ===============================
  // ✅ Reserve prefetch core (returns ReserveCache or null)
  // ===============================
  async function doPrefetchReserve(
    reason: string,
    force = false
  ): Promise<ReserveCache | null> {
    return await prefetchCheckoutReserve({
      reason,
      force,
      hasItems,
      cart,
      reserveLoading,
      apiURL,
      reserveAbortRef,
      lastReserveKeyRef,
      setReserveLoading,
      setReserveErr,
      setReservationId,
      setReservationExpiresAtSec,
      setReservationCartHash,
    });
  }

  // ✅ NEW: Ensure reserve exactly once (mutex) for Address -> Delivery transition
  async function ensureReserveBeforeNext(): Promise<ReserveCache> {
    return await ensureCheckoutReserveBeforeNext({
      hasItems,
      cart,
      reservationId,
      reservationExpiresAtSec,
      reservationCartHash,
      reservePromiseRef,
      setReserveErr,
      runPrefetch: () => doPrefetchReserve("address_continue", true),
    });
  }

  function schedulePrefetchReserve(reason: string, force = false) {
    scheduleCheckoutReservePrefetch({
      reserveTimerRef,
      reason,
      force,
      runPrefetch: () => doPrefetchReserve(reason, force),
    });
  }

  async function fetchShippingQuotesBoth() {
    await fetchCheckoutShippingQuotesBoth({
      hasItems,
      address,
      itemsMinor,
      deliveryMethod,
      remoteBase: REMOTE_BASE,
      apiURL,
      abortRef,
      setQuoteLoading,
      setQuoteError,
      setQuoteByMethod,
      setLastQuoteMeta,
    });
  }

  useEffect(() => {
    void fetchShippingQuotesBoth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteReqKey]);


  // ✅ 进入 Address 时自动 prefetch reserve
  useEffect(() => {
    if (step === "address" && hasItems) {
      schedulePrefetchReserve("enter_address");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cartHash]);


  // ✅ 方案 A：cart 变化时只清理旧 reservation（不自动 reserve）
  // reserve 只在 Address 点击 Continue 时发生
  useEffect(() => {
    if (!hasItems) {
      resetReserveForEmptyCart({
        lastCartHashRef,
        setReservationId,
        setReservationExpiresAtSec,
        setReservationCartHash,
        setReserveErr,
        setReserveLoading,
        reservePromiseRef,
      });
      return;
    }

    const nextHash = cartHash || "";
    const prevHash = lastCartHashRef.current;

    if (!nextHash || nextHash === prevHash) return;

    // cart hash 变了：旧 reservation 不可信（清理）
    resetReserveForCartHashChange({
      lastCartHashRef,
      nextHash,
      setReservationId,
      setReservationExpiresAtSec,
      setReservationCartHash,
      setReserveErr,
      setReserveLoading,
      reservePromiseRef,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHash, hasItems]);

  // ✅ 卸载清理：abort + clear timers + release reservation
  useEffect(() => {
    const { onPageHide, onBeforeUnload } = createReserveWindowLifecycleHandlers({
      releaseNow: releaseReservationNow,
    });

    attachReserveWindowLifecycle({
      onPageHide,
      onBeforeUnload,
    });

    return () => {
      // 1) 先释放 reservation（组件卸载）
      void releaseReservationNow("checkout_unmount");

      // 2) 清理监听
      detachReserveWindowLifecycle({
        onPageHide,
        onBeforeUnload,
      });

      // 3) abort reserve & clear timer
      cleanupReserveResources({
        abortReserveRequest: () => {
          try {
            reserveAbortRef.current?.abort();
          } catch {}
        },
        clearReserveTimer: () => {
          try {
            if (reserveTimerRef.current) clearTimeout(reserveTimerRef.current);
          } catch {}
        },
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===============================
  // ✅ Effective fee / totals
  // ===============================
  const {
    serverFeeMinorSelected,
    deliveryFeeMinorEffective,
    deliveryFeeMajorEffective,
    standardUnlocked,
    standardFreeThresholdMinor,
    discountMinor,
    taxMinor,
    totalMinorEffective,
    totalMajorEffective,
    amountInMajorUnitEffective,
  } = getCheckoutTotals({
    deliveryMethod,
    quoteByMethod,
    deliveryFeeMinorFallback,
    itemsMinor,
  });

  const nextStepCore = () => {
    setStepAndURL(getNextCheckoutStep(step));
  };
  const prevStep = () => {
    setStepAndURL(getPrevCheckoutStep(step));
  };

  async function sendSubscriptionIfNeeded(emailRaw?: string) {
    await runCheckoutSubscriptionIfNeeded({
      emailRaw,
      accountEmail,
      addressEmail: address?.email || null,
      marketingOptIn,
      step,
      remoteBase: REMOTE_BASE,
      apiURL,
    });
  }

  const {
    showFreeShipping,
    deliveryFeeMinorByMethod,
    etaByMethod,
    quoteMatchedText,
  } = getCheckoutDeliveryViewModel({
    hasItems,
    deliveryMethod,
    quoteByMethod,
    quoteLoading,
    quoteError,
    addressCountry: address?.country,
    currency,
  });

  const handleContinue = async () => {
    await runCheckoutContinue({
      step,
      hasItems,
      cartLength: cart?.length || 0,
      isLoggedIn,
      address,
      billingAddress,
      sameAsDelivery,
      setContinueErrMsg,
      setAddressErrs,
      setBillingErrs,
      setAddressShowErrors,
      ensureReserveBeforeNext,
      nextStepCore,
      sendSubscriptionIfNeeded,
    });
  };

  const handlePaySucceeded = async (payload?: any) => {
    console.log("[checkout] handlePaySucceeded() payload =", payload);
    setPayPersistErrMsg(null);
    setIsPayProcessing(true);

    const result = await finalizeCheckoutPaySuccess({
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
      sendSubscriptionIfNeeded: () => sendSubscriptionIfNeeded(),
      confirmPath: CONFIRM_PATH,
      replaceToConfirm: (path: string) => router.replace(path),
    });

    if (!result.ok) {
      console.warn("[checkout] finalizeCheckoutPaySuccess failed", { payload, result });
      setPayPersistErrMsg(result.error);
      setIsPayProcessing(false);
      return;
    }

    console.log("[checkout] ✅ order already created by PayPalBigButton, redirecting to", CONFIRM_PATH);
  };

  const handlePayInitiated = () => {
    void sendSubscriptionIfNeeded();
  };

  const handleLoginAndContinue = () => {
    handleCheckoutLoginAndContinue(router.push);
  };

  const alertVariant = getCheckoutAlertVariant(formAlert.alert?.type);

  const { blockContinue, continueText } = getCheckoutContinueButtonState({
    step,
    reserveLoading,
  });

  const bagStepProps = buildCheckoutBagStepProps({
    cart,
    setCart,
    currency,
    itemsMajor,
    savedMajor,
    hasItems,
    deliveryThreshold: DELIVERY_FREE_THRESHOLD,
    deliveryFlat: deliveryFeeMajorEffective,
    amountInMajorUnit: amountInMajorUnitEffective,
  });

  const addressStepProps = buildCheckoutAddressStepProps({
    isLoggedIn,
    accountEmail,
    address,
    setAddress,
    billingAddress,
    setBillingAddress,
    sameAsDelivery,
    setSameAsDelivery,
    hasSavedDelivery,
    hasSavedBilling,
    savedDeliveryAddr,
    savedBillingAddr,
    useSavedDelivery,
    setUseSavedDelivery,
    useSavedBilling,
    setUseSavedBilling,
    addressShowErrors,
    addressErrs,
    billingErrs,
    handleBillingFieldChange,
    clearAddressErrors,
    clearBillingErrors,
    saveMsg,
    onSaveDefault: handleSaveDefaultAddress,
    marketingOptIn,
    setMarketingOptIn,
    sendSubscriptionIfNeeded,
  });

  const deliveryStepProps = buildCheckoutDeliveryStepProps({
    deliveryMethod,
    setDeliveryMethod,
    showFreeShipping,
    standardFreeThresholdMinor,
    currency,
    deliveryFeeMinorByMethod,
    etaByMethod,
    quoteLoading,
    quoteError,
    quoteMatchedText,
  });

  const paymentStepProps = buildCheckoutPaymentStepProps({
    visible: step === "payment",
    amountInMajorUnit: amountInMajorUnitEffective,
    isPayProcessing,
    isLoggedIn,
    accountEmail,
    address,
    deliveryMethod,
    itemsCount,
    itemsMinor,
    deliveryFeeMinor: deliveryFeeMinorEffective,
    totalMinor: totalMinorEffective,
    currency,
    onPayInitiated: handlePayInitiated,
    onPaySucceeded: handlePaySucceeded,
    preReservationId: reservationId,
    preReservationExpiresAtSec: reservationExpiresAtSec,
    preReservationCartHash: reservationCartHash,
    preReserveLoading: reserveLoading,
    preReserveError: reserveErr,
    cart,
    onBackToBag: () => setStepAndURL("bag"),
  });

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-5">
          <PageBack />
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-6">
          {step === "bag" && <BagStep {...bagStepProps} />}

          {step === "address" && <AddressStep {...addressStepProps} />}

          {step === "delivery" && (
            <div className="space-y-3">
              <DeliveryStep {...deliveryStepProps} />
            </div>
          )}

          {step === "payment" && payPersistErrMsg ? (
            <div className="px-4">
              <Alert variant={"error" as any}>{payPersistErrMsg}</Alert>
            </div>
          ) : null}

          <PaymentStep {...paymentStepProps} />

          {step === "payment" && (
            <div className="px-4 pb-4 pt-2 flex justify-end">
              <div className="w-[320px] max-w-full">
                <LargeBackButton onClick={() => setStepAndURL("delivery")} />
              </div>
            </div>
          )}
        </div>

        {step !== "payment" && (
          <>
            {/* ✅ Step 7: Continue 按钮在 reserveLoading 时禁用（防止 reserve 未完成就跳到 payment） */}
            <div className="mt-6 flex justify-end">
              {step === "bag" ? (
                <div
                  className={
                    isLoggedIn
                      ? "w-[320px] max-w-full"
                      : "w-[660px] max-w-full flex gap-3 justify-end"
                  }
                >
                  {!isLoggedIn && (
                    <div className="w-[320px]">
                      <LargeGhostButton onClick={handleLoginAndContinue}>
                        Login / Sign up and Continue
                      </LargeGhostButton>
                    </div>
                  )}

                  <div className="w-[320px]">
                    <LargePrimaryButton onClick={handleContinue}>
                      Continue
                    </LargePrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="w-[660px] max-w-full flex gap-3 justify-end">
                  <LargeBackButton onClick={prevStep} />

                  <LargePrimaryButton
                    onClick={handleContinue}
                    disabled={blockContinue}
                  >
                    {continueText}
                  </LargePrimaryButton>
                </div>
              )}
            </div>

            {(step === "bag" || step === "address") &&
            formAlert.hasAlert &&
            formAlert.alert?.message ? (
              <div className="mt-2 flex justify-end">
                <div className={step === "bag" ? "w-[320px] max-w-full" : "w-[660px] max-w-full"}>
                  <Alert variant={alertVariant as any}>{formAlert.alert.message}</Alert>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

