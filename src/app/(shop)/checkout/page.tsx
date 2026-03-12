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
import {
  useAddress,
  emptyErr,
  validateAddress,
} from "./(hooks)/useAddress";
import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";
import { countryLabelOf } from "@/lib/country";
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
  LS_ADDRESS_KEY,
  RESERVE_DEBOUNCE_MS,
} from "./constants";
import { isStepKey } from "./stepper";
import { buildCartHash, cartToReserveItems } from "./reserve-helpers";
import {
  clearReserveLocalState as clearReserveLocalStateHelper,
  releaseReservationNow as releaseReservationNowHelper,
} from "./reserve-actions";
import {
  doPrefetchReserveHelper,
  ensureReserveBeforeNextHelper,
} from "./reserve-prefetch";
import {
  resetReserveForCartHashChange,
  resetReserveForEmptyCart,
  scheduleReservePrefetch,
} from "./reserve-runtime";
import {
  attachReserveWindowLifecycle,
  cleanupReserveResources,
  createReserveWindowLifecycleHandlers,
  detachReserveWindowLifecycle,
  shouldReleaseOnRouteLeave,
} from "./reserve-lifecycle";
import {
  addCheckoutPaymentPreconnectHints,
  attachCheckoutAuthSyncListeners,
  restoreCheckoutAddressFromStorage,
} from "./checkout-browser-effects";
import {
  sendCheckoutSubscriptionIfNeeded,
  syncCheckoutAuthState,
} from "./checkout-side-effects";
import {
  getNextCheckoutStep,
  getPrevCheckoutStep,
  goToCheckoutLogin,
  setCheckoutStepAndURL,
} from "./checkout-navigation";
import { fetchShippingQuotesBothHelper } from "./shipping-quote-actions";
import {
  buildQuoteReqKey,
  type ShippingQuoteAPIResult,
} from "./shipping-quote";

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

  /**
   * ✅ 单一权威来源：
   * 不再通过 cookie 单独判断登录态，也不再单独 fetch 邮箱。
   * 统一只认 /api/auth/me -> getSessionUser(true)
   */
  const syncAuthState = async () => {
    await syncCheckoutAuthState({
      setIsLoggedIn,
      setAccountEmail,
    });
  };

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

  const initialStepFromURL = (() => {
    const s = searchParams.get("step");
    return isStepKey(s) ? (s as StepKey) : ("bag" as StepKey);
  })();
  const [step, setStep] = useState<StepKey>(initialStepFromURL);

  // ✅ NEW: keep local step state in sync with URL (?step=...)
  const stepParam = searchParams.get("step");
  useEffect(() => {
    if (isStepKey(stepParam) && stepParam !== step) {
      setStep(stepParam);
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
    addCheckoutPaymentPreconnectHints();
  }, []);

  useEffect(() => {
    restoreCheckoutAddressFromStorage({
      storageKey: LS_ADDRESS_KEY,
      fallbackCountry: "AU",
      setAddress,
    });

    void syncAuthState();

    const detach = attachCheckoutAuthSyncListeners({
      syncAuthState,
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
    return buildQuoteReqKey({
      hasItems: !!hasItems,
      itemsMinor: Number(itemsMinor) || 0,
      country: address?.country,
      state: address?.state,
      postcode: address?.postcode,
    });
  }, [address?.country, address?.state, address?.postcode, hasItems, itemsMinor]);


  const cartHash = useMemo(() => {
    if (!hasItems) return "";
    const items = cartToReserveItems(cart);
    if (!items.length) return "";
    return buildCartHash(items);
  }, [cart, hasItems]);

  // ===============================
  // ✅ Release reservation immediately (leave checkout / close tab / refresh)
  // ===============================
  function clearReserveLocalState() {
    clearReserveLocalStateHelper({
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
    await releaseReservationNowHelper({
      reason,
      reservationId,
      apiURL,
      abortInFlightReserve: () => {
        try {
          reserveAbortRef.current?.abort();
        } catch {}
      },
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
    return await doPrefetchReserveHelper({
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
    return await ensureReserveBeforeNextHelper({
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
    scheduleReservePrefetch({
      reserveTimerRef,
      debounceMs: RESERVE_DEBOUNCE_MS,
      runPrefetch: () => doPrefetchReserve(reason, force),
    });
  }

  async function fetchShippingQuotesBoth() {
    await fetchShippingQuotesBothHelper({
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

  const serverFeeMinorSelected =
    quoteByMethod?.[deliveryMethod]?.ok
      ? Number(quoteByMethod?.[deliveryMethod]?.delivery_fee_minor ?? 0)
      : null;

  const deliveryFeeMinorEffective =
    serverFeeMinorSelected != null ? serverFeeMinorSelected : deliveryFeeMinorFallback;

  const deliveryFeeMajorEffective = deliveryFeeMinorEffective / 100;

  const standardUnlocked =
    quoteByMethod?.standard?.ok && typeof quoteByMethod.standard.standard_free_unlocked === "boolean"
      ? !!quoteByMethod.standard.standard_free_unlocked
      : false;

  const standardFreeThresholdMinor =
    quoteByMethod?.standard?.ok && typeof quoteByMethod.standard.standard_free_threshold_minor === "number"
      ? Number(quoteByMethod.standard.standard_free_threshold_minor)
      : null;

  const discountMinor = 0;
  const taxMinor = 0;

  const totalMinorEffective = Math.max(
    0,
    (Number(itemsMinor) + Number(deliveryFeeMinorEffective) + taxMinor - discountMinor) | 0
  );

  const totalMajorEffective = totalMinorEffective / 100;
  const amountInMajorUnitEffective = totalMajorEffective;

  const nextStepCore = () => {
    setStepAndURL(getNextCheckoutStep(step));
  };
  const prevStep = () => {
    setStepAndURL(getPrevCheckoutStep(step));
  };

  const clientTZ =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  const clientUTCOffsetMin = -new Date().getTimezoneOffset();
  const FORCE_CN_TZ = "Asia/Shanghai";

  async function sendSubscriptionIfNeeded(emailRaw?: string) {
    await sendCheckoutSubscriptionIfNeeded({
      emailRaw,
      accountEmail,
      addressEmail: address?.email || null,
      marketingOptIn,
      step,
      clientTZ,
      clientUTCOffsetMin,
      forceTZ: FORCE_CN_TZ,
      remoteBase: REMOTE_BASE,
      apiURL,
    });
  }

  const handleContinue = async () => {
  if (step === "bag") {
    if (!hasItems || (cart?.length || 0) === 0) {
      setContinueErrMsg("Your bag is empty. Please add at least one item before continuing.");
      return;
    }
    setContinueErrMsg(null);
    nextStepCore();
    return;
  }

  if (step === "address") {
    const ignoreEmail = isLoggedIn || !!(address.email && address.email.trim());
    const deliveryRes = validateAddress(address, "", ignoreEmail);
    const billingRes = sameAsDelivery
      ? { valid: true, errs: emptyErr }
      : validateAddress(billingAddress, "", true);

    setAddressErrs(deliveryRes.errs);
    setBillingErrs(billingRes.errs);

    if (!deliveryRes.valid || !billingRes.valid) {
      setAddressShowErrors(true);
      setContinueErrMsg("Please complete all required delivery address fields before saving.");

      const el = document.getElementById("address-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setContinueErrMsg(null);
    setAddressShowErrors(false);
    setAddressErrs(emptyErr);
    setBillingErrs(emptyErr);

    if (!isLoggedIn) void sendSubscriptionIfNeeded();

    // Address 校验通过后，直接进入 Delivery
    nextStepCore();
    return;
  }

  // delivery -> payment
  if (step === "delivery") {
    try {
      await ensureReserveBeforeNext();
    } catch (e) {
      // reserveErr 已在 ensure 内部设置
      return;
    }

    nextStepCore();
    return;
  }
};

  const handlePaySucceeded = async (payload?: any) => {
  console.log("[checkout] handlePaySucceeded() payload =", payload);
  setPayPersistErrMsg(null);

  setIsPayProcessing(true);

  // ✅ 1) 从 PaymentStep 带来的 totals（用于 confirmation 兜底展示）
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

  const cartForPreview =
    Array.isArray(checkoutTotals?.items) && checkoutTotals.items.length
      ? checkoutTotals.items
      : cart;

  // ✅ 2) 方案 A：订单一定是 PayPalBigButton 已经在 worker /orders 创建成功后才会触发 onSucceeded
  // PayPalBigButton 里 merged = { ...paypalPayload, successMeta, order: orderResp }
  // 这里的 payload.order 就是 orderResp（即 worker 的返回）
  const orderResp = payload?.order ?? null;

  // 兼容多种返回结构：尽量稳健提取 orderId / orderNumber
  const createdOrder =
    orderResp?.order?.order ?? // 极少数情况（如果你后端再包一层）
    orderResp?.order ?? // 常见：{ ok:true, order:{...} }
    orderResp?.data?.order ?? // 有些 fetch wrapper 会包 data
    orderResp?.result?.order ??
    null;

  const orderId: number | null =
    createdOrder && typeof createdOrder.id === "number" ? createdOrder.id : null;

  const orderNumber: string | null =
    createdOrder && (typeof createdOrder.order_number === "string" || createdOrder.order_number == null)
      ? (createdOrder.order_number ?? null)
      : null;

  if (!orderId) {
    console.warn("[checkout] missing order id in payload.order", { orderResp, payload });
    setPayPersistErrMsg(
      "We couldn’t finalize your order right now. If you were charged, contact support."
    );
    setIsPayProcessing(false);
    return;
  }

  // ✅ 3) 写 preview（confirmation 拉不到订单时也能展示）
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

  console.log("[checkout] ✅ order already created by PayPalBigButton, redirecting to", CONFIRM_PATH);

  // ✅ 4) 清空购物车 & 异步订阅
  clearCart();
  void sendSubscriptionIfNeeded();

  // ✅ 5) 跳转 confirmation（不留历史）
  try {
    router.replace(CONFIRM_PATH);
  } catch {}

  setTimeout(() => {
    try {
      if (typeof window !== "undefined" && window.location?.pathname !== CONFIRM_PATH) {
        window.location.replace(CONFIRM_PATH);
      }
    } catch {}
  }, 50);
};

  const handlePayInitiated = () => {
    void sendSubscriptionIfNeeded();
  };

  const handleLoginAndContinue = () => {
    goToCheckoutLogin({
      push: router.push,
      next: "/checkout?step=address",
    });
  };

  const alertVariant =
    formAlert.alert?.type === "success"
      ? "success"
      : formAlert.alert?.type === "warning"
        ? "warning"
        : formAlert.alert?.type === "info"
          ? "info"
          : "error";

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-5">
          <PageBack />
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-6">
          {step === "bag" && (
            <BagStep
              cart={cart}
              setCart={setCart}
              currency={currency}
              itemsMajor={itemsMajor}
              savedMajor={savedMajor}
              hasItems={hasItems}
              deliveryThreshold={DELIVERY_FREE_THRESHOLD}
              deliveryFlat={deliveryFeeMajorEffective}
              amountInMajorUnit={amountInMajorUnitEffective}
            />
          )}

          {step === "address" && (
            <AddressStep
              isLoggedIn={isLoggedIn}
              accountEmail={accountEmail}
              address={address}
              setAddress={setAddress}
              billingAddress={billingAddress}
              setBillingAddress={setBillingAddress}
              sameAsDelivery={sameAsDelivery}
              setSameAsDelivery={setSameAsDelivery}
              hasSavedDelivery={hasSavedDelivery}
              hasSavedBilling={hasSavedBilling}
              savedDeliveryAddr={savedDeliveryAddr}
              savedBillingAddr={savedBillingAddr}
              useSavedDelivery={useSavedDelivery}
              setUseSavedDelivery={setUseSavedDelivery}
              useSavedBilling={useSavedBilling}
              setUseSavedBilling={setUseSavedBilling}
              addressShowErrors={addressShowErrors}
              addressErrs={addressErrs}
              billingErrs={billingErrs}
              handleBillingFieldChange={handleBillingFieldChange}
              clearAddressErrors={clearAddressErrors}
              clearBillingErrors={clearBillingErrors}
              saveMsg={saveMsg}
              onSaveDefault={handleSaveDefaultAddress}
              marketingOptIn={marketingOptIn}
              setMarketingOptIn={setMarketingOptIn}
              sendSubscriptionIfNeeded={sendSubscriptionIfNeeded}
            />
          )}

          {step === "delivery" && (
            <div className="space-y-3">
              <DeliveryStep
                deliveryMethod={deliveryMethod}
                setDeliveryMethod={setDeliveryMethod}
                showFreeShipping={hasItems && standardUnlocked}
                standardFreeThresholdMinor={standardFreeThresholdMinor}
                currency={currency}
                deliveryFeeMinorByMethod={{
                  standard: quoteByMethod?.standard?.ok
                    ? Number(quoteByMethod.standard.delivery_fee_minor ?? 0)
                    : null,
                  express: quoteByMethod?.express?.ok
                    ? Number(quoteByMethod.express.delivery_fee_minor ?? 0)
                    : null,
                }}
                etaByMethod={{
                  standard: quoteByMethod?.standard?.ok
                    ? {
                        eta_min_total: Number(quoteByMethod.standard.eta_min_total ?? 0) || null,
                        eta_max_total: Number(quoteByMethod.standard.eta_max_total ?? 0) || null,
                        min_days: Number(quoteByMethod.standard.min_days ?? 0) || null,
                        max_days: Number(quoteByMethod.standard.max_days ?? 0) || null,
                        handling_days: Number(quoteByMethod.standard.handling_days ?? 0) || null,
                        warehouse_code: (quoteByMethod.standard.warehouse_code ?? null) as any,
                        carrier_service: (quoteByMethod.standard.carrier_service ?? null) as any,
                        eta_note: (quoteByMethod.standard.eta_note ?? null) as any,
                      }
                    : undefined,

                  express: quoteByMethod?.express?.ok
                    ? {
                        eta_min_total: Number(quoteByMethod.express.eta_min_total ?? 0) || null,
                        eta_max_total: Number(quoteByMethod.express.eta_max_total ?? 0) || null,
                        min_days: Number(quoteByMethod.express.min_days ?? 0) || null,
                        max_days: Number(quoteByMethod.express.max_days ?? 0) || null,
                        handling_days: Number(quoteByMethod.express.handling_days ?? 0) || null,
                        warehouse_code: (quoteByMethod.express.warehouse_code ?? null) as any,
                        carrier_service: (quoteByMethod.express.carrier_service ?? null) as any,
                        eta_note: (quoteByMethod.express.eta_note ?? null) as any,
                      }
                    : undefined,
                }}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                quoteMatchedText={
                  !quoteLoading && !quoteError && quoteByMethod?.[deliveryMethod]?.ok
                    ? `Shipping matched: ${countryLabelOf(address?.country || "AU")} · option ${deliveryMethod} · fee ${(
                        (Number(quoteByMethod?.[deliveryMethod]?.delivery_fee_minor ?? 0) || 0) / 100
                      ).toFixed(2)} ${currency || "AUD"}`
                    : null
                }
              />
            </div>
          )}

          {step === "payment" && payPersistErrMsg ? (
            <div className="px-4">
              <Alert variant={"error" as any}>{payPersistErrMsg}</Alert>
            </div>
          ) : null}

          <PaymentStep
            visible={step === "payment"}
            amountInMajorUnit={amountInMajorUnitEffective}
            isPayProcessing={isPayProcessing}
            isLoggedIn={isLoggedIn}
            accountEmail={accountEmail}
            address={address}
            deliveryMethod={deliveryMethod}
            itemsCount={itemsCount}
            itemsMinor={itemsMinor}
            deliveryFeeMinor={deliveryFeeMinorEffective}
            totalMinor={totalMinorEffective}
            currency={currency}
            onPayInitiated={handlePayInitiated}
            onPaySucceeded={handlePaySucceeded}

            // ✅ pre-reserve result from Address step
            preReservationId={reservationId}
            preReservationExpiresAtSec={reservationExpiresAtSec}
            preReservationCartHash={reservationCartHash}
            preReserveLoading={reserveLoading}
            preReserveError={reserveErr}
            cart={cart}
            onBackToBag={() => setStepAndURL("bag")}
          />

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
            {(() => {
              const blockContinue =
                step === "delivery" && reserveLoading;
              const continueText = blockContinue ? "Reserving..." : "Continue";

              return (
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
              );
            })()}

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

