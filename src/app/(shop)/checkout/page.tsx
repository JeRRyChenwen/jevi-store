// src/app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "./(hooks)/useCart";
import { usePricing } from "./(hooks)/usePricing";
import { useAddress } from "./(hooks)/useAddress";
import { useCheckoutReservation } from "./(hooks)/useCheckoutReservation";
import { useCheckoutShippingQuotes } from "./(hooks)/useCheckoutShippingQuotes";
import { useFormAlert } from "@/hooks/useFormAlert";
import CheckoutPageView from "./checkout-page-view";
import type {
  DeliveryMethod,
  StepKey,
} from "./types";
import {
  CONFIRM_PATH,
  DELIVERY_FLAT,
  DELIVERY_FREE_THRESHOLD,
  DISPLAY_CURRENCY,
} from "./constants";
import {
  getNextCheckoutStep,
  getPrevCheckoutStep,
  setCheckoutStepAndURL,
} from "./checkout-navigation";
import { getCheckoutTotals } from "./checkout-totals";
import { runCheckoutSubscriptionIfNeeded } from "./checkout-subscription";
import { finalizeCheckoutPaySuccess } from "./checkout-pay-success";
import { getCheckoutDeliveryViewModel } from "./checkout-delivery-view-model";
import { runCheckoutContinue } from "./checkout-continue";
import {
  runCheckoutPageBootstrap,
  runCheckoutPagePreconnect,
} from "./checkout-bootstrap-runtime";
import { coerceCheckoutStep } from "./checkout-derived-state";
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

  const {
    quoteLoading,
    quoteError,
    quoteByMethod,
    lastQuoteMeta,
    cartHash,
  } = useCheckoutShippingQuotes({
    hasItems,
    cart,
    itemsMinor,
    address,
    deliveryMethod,
    remoteBase: REMOTE_BASE,
    apiURL,
  });

  const {
    reserveLoading,
    reserveErr,
    reservationId,
    reservationExpiresAtSec,
    reservationCartHash,
    ensureReserveBeforeNext,
  } = useCheckoutReservation({
    hasItems,
    cart,
    cartHash,
    step,
    apiURL,
  });

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
    <CheckoutPageView
      step={step}
      setStepAndURL={setStepAndURL}
      bagStepProps={bagStepProps}
      addressStepProps={addressStepProps}
      deliveryStepProps={deliveryStepProps}
      paymentStepProps={paymentStepProps}
      payPersistErrMsg={payPersistErrMsg}
      isLoggedIn={isLoggedIn}
      handleLoginAndContinue={handleLoginAndContinue}
      handleContinue={handleContinue}
      prevStep={prevStep}
      blockContinue={blockContinue}
      continueText={continueText}
      formAlertHasAlert={formAlert.hasAlert}
      formAlertMessage={formAlert.alert?.message}
      alertVariant={alertVariant}
    />
  );
}