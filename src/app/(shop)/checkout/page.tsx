// src/app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageBack from "@/components/PageBack";
import type { CartItem as CartListItem } from "@/components/cart/CartList";
import { effectiveMinor, type Currency } from "@/lib/pricing";
import { fetchAuthedEmail, isLoggedInViaCookie } from "@/lib/auth";
import BagStep from "./_components/BagStep";
import AddressStep from "./_components/AddressStep";
import DeliveryStep from "./_components/DeliveryStep";
import PaymentStep from "./_components/PaymentStep";
import { useCart } from "./(hooks)/useCart";
import { usePricing, itemToPriceRecs } from "./(hooks)/usePricing";
import {
  useAddress,
  type Address,
  emptyErr,
  validateAddress,
  EMAIL_RE,
} from "./(hooks)/useAddress";

// ✅ 统一提示体系
import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";

type CartItem = CartListItem;

/* ---------------- 常量 ---------------- */
const LS_ADDRESS_KEY = "sp.checkout.address";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;
const DISPLAY_CURRENCY: Currency = "AUD";
const CONFIRM_PATH = "/order/confirmation";

/* 工具：本地 /api 优先（需要远端时单独指定） */
const apiURL = (path: string) => `/api${path}`;
const REMOTE_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/* ---------------- Stepper ---------------- */
type StepKey = "bag" | "address" | "delivery" | "payment";
const STEP_LIST: { key: StepKey; label: string }[] = [
  { key: "bag", label: "Bag" },
  { key: "address", label: "Address" },
  { key: "delivery", label: "Delivery" },
  { key: "payment", label: "Payment" },
];
const isStepKey = (v: any): v is StepKey =>
  v === "bag" || v === "address" || v === "delivery" || v === "payment";

function CheckoutSteps({
  step,
  onChange,
}: {
  step: StepKey;
  onChange: (next: StepKey) => void;
}) {
  const currentIndex = STEP_LIST.findIndex((s) => s.key === step);
  const progress = (currentIndex / (STEP_LIST.length - 1)) * 100;

  return (
    <div className="relative pt-8 pb-10">
      <div className="absolute left-0 right-0 top-6 h-[2px] bg-neutral-200" />
      <div
        className="absolute left-0 top-6 h-[2px] bg-black transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative flex items-center justify-between">
        {STEP_LIST.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isLocked = i > currentIndex; // 只能回退，不允许前进
          const baseCircle =
            "flex items-center justify-center h-8 w-8 rounded-full border text-sm";
          const circleClass = isActive
            ? "bg-black text-white border-black"
            : isDone
              ? "bg-white text-black border-black"
              : "bg-white text-neutral-400 border-neutral-300";
          const labelClass = isActive
            ? "text-black"
            : isDone
              ? "text-neutral-500"
              : "text-neutral-400";

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                if (!isLocked) onChange(s.key);
              }}
              tabIndex={isLocked ? -1 : 0}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={isLocked ? true : undefined}
              title={isLocked ? "Complete previous steps to continue" : s.label}
              className={[
                "group flex w-1/4 flex-col items-center gap-2 focus:outline-none select-none",
                isLocked
                  ? "cursor-default opacity-50 pointer-events-auto"
                  : "cursor-pointer",
              ].join(" ")}
            >
              <div className={`${baseCircle} ${circleClass}`}>
                {isDone ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
              </div>
              <div className={`text-sm font-medium ${labelClass}`}>{s.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Delivery ---------------- */
type DeliveryMethod = "standard" | "express";

/* ---------------- 大按钮 ---------------- */
function LargeBackButton({
  onClick,
  className = "",
  disabled,
}: {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full border bg-white px-6 py-3 text-sm font-semibold",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-50",
        "text-neutral-900 w-full",
        className,
      ].join(" ")}
    >
      Back
    </button>
  );
}
function LargePrimaryButton({
  onClick,
  children,
  className = "",
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full px-6 py-3 text-sm font-semibold w-full",
        disabled
          ? "bg-neutral-300 text-white cursor-not-allowed"
          : "bg-neutral-900 text-white hover:bg-neutral-800",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
function LargeGhostButton({
  onClick,
  children,
  className = "",
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full border bg-white px-6 py-3 text-sm font-semibold w-full",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-50",
        "text-neutral-900",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ========= 成功支付后把订单发送给 Worker（返回 order 对象） ========= */
async function sendOrderToServer(args: {
  cart: any[];
  address: Address;
  currency: string;
  itemsMinor: number;
  deliveryFeeMinor: number;
  taxMinor?: number;
  grandMinor: number;

  // 💳 通用支付结果（PayPal / Braintree）
  payment: any;
  paymentProvider?: "paypal" | "braintree";

  deliveryMethod?: "standard" | "express";
  billingAddress?: Address | null;
  sameAsDelivery?: boolean;
}): Promise<{ ok: boolean; order?: { id: number; order_number: string | null } }> {
  try {
    const target = "/api/orders";

    console.log("[orders] sendOrderToServer() args =", {
      cartCount: (args.cart || []).length,
      currency: args.currency,
      itemsMinor: args.itemsMinor,
      deliveryFeeMinor: args.deliveryFeeMinor,
      grandMinor: args.grandMinor,
      payment: args.payment,
      paymentProviderHint: args.paymentProvider,
    });

    // ① 计算每一行条目（与后端字段对齐）
    const items = (args.cart || []).map((it: any) => {
      const recs = itemToPriceRecs(it);
      const rec = recs.find((r) => r.currency === (args.currency as Currency));
      const unitMinor = rec ? effectiveMinor(rec) : Math.round(Number(it?.price || 0) * 100);
      const qty = Math.max(1, Number(it?.qty) || 1);
      const lineMinor = unitMinor * qty;

      // ✅ HEIGHT PATCH（前端）：把 heightIncreaseCm 带进 items[]
      // 兼容：it.heightIncreaseCm / it.heightIncrease / it.height / it.height_increase_cm
      // 也兼容：it.attrs?.heightIncreaseCm / it.attrs?.heightIncrease
      const hRaw =
        it?.heightIncreaseCm ??
        it?.heightIncrease ??
        it?.height ??
        it?.height_increase_cm ??
        it?.attrs?.heightIncreaseCm ??
        it?.attrs?.heightIncrease ??
        it?.attrs?.height ??
        0;

      const hNum = Number(hRaw);
      const heightIncreaseCm = Number.isFinite(hNum) ? hNum : 0;

      return {
        product_id: it?.id ?? null,
        product_sku: it?.sku ?? null,
        product_title: String(it?.title || it?.name || "Item"),
        variant_title:
          it?.variant || [it?.color, it?.size].filter(Boolean).join(" / ") || null,
        qty,
        currency: args.currency,
        unit_price_minor: unitMinor,
        line_total_minor: lineMinor,
        discount_minor: 0,
        tax_minor: 0,

        // ✅ HEIGHT PATCH：顶层字段，方便后端直接读取
        heightIncreaseCm, // 数字，0 也会发送

        snapshot: {
          slug: it?.slug ?? null,
          image: it?.image || it?.img || null,
          attrs: {
            color: it?.color ?? null,
            size: it?.size ?? null,

            // ✅ HEIGHT PATCH：也写一份进 snapshot，方便以后扩展
            heightIncreaseCm,

            ...(it?.attrs || {}),
          },
        },
      };
    });

    // ② 识别支付提供方 & 提取交易号 + 卡信息
    const pay = args.payment || null;

    const provider: "paypal" | "braintree" =
      args.paymentProvider ||
      (pay && (pay.paymentMethod || pay.cardBrand || pay.cardLast4 || pay.provider === "braintree")
        ? "braintree"
        : "paypal");

    let provider_txn_id: string | null = null;
    let payment_method: string | null = null;
    let card_brand: string | null = null;
    let card_last4: string | null = null;
    let raw: any = pay || null;

    if (provider === "braintree") {
      provider_txn_id =
        pay?.provider_txn_id ||
        pay?.transactionId ||
        pay?.id ||
        pay?.txnId ||
        null;
      payment_method =
        pay?.paymentMethod ||
        (pay?.cardBrand || pay?.cardLast4 ? "card" : "paypal");
      card_brand = pay?.cardBrand ?? null;
      card_last4 = pay?.cardLast4 ?? null;
      raw = pay?.raw ?? pay ?? null;
    } else {
      const cap =
        pay?.purchase_units?.[0]?.payments?.captures?.[0] ||
        pay?.transaction ||
        null;
      provider_txn_id =
        cap?.id ||
        pay?.id ||
        pay?.paypalTransactionId ||
        null;
      payment_method = "paypal";
      card_brand = null;
      card_last4 = null;
      raw = pay ?? null;
    }

    console.log("[orders] normalized payment fields =", {
      provider,
      provider_txn_id,
      payment_method,
      card_brand,
      card_last4,
    });

    // ③ 计算账单地址（只放到 meta 里）
    const billing =
      (args.sameAsDelivery ? args.address : args.billingAddress || args.address) || {};

    const billingMeta = {
      first_name: billing.firstName || null,
      last_name: billing.lastName || null,
      email: (billing.email || "").trim() || null,
      phone: billing.phone || null,
      line1: billing.line1 || null,
      line2: billing.line2 || null,
      city: billing.city || null,
      state: billing.state || null,
      postcode: billing.postcode || null,
      country: billing.country || null,
      same_as_delivery: !!args.sameAsDelivery,
    };

    // ④ 组装请求体
    const body = {
      email: (args.address?.email || "").trim() || "",
      first_name: args.address?.firstName || null,
      last_name: args.address?.lastName || null,
      phone: args.address?.phone || null,
      addr_line1: args.address?.line1 || null,
      addr_line2: args.address?.line2 || null,
      addr_city: args.address?.city || null,
      addr_state: args.address?.state || null,
      addr_postcode: args.address?.postcode || null,
      addr_country: args.address?.country || null,

      currency: args.currency,
      items_total_minor: Number(args.itemsMinor) || 0,
      delivery_fee_minor: Number(args.deliveryFeeMinor) || 0,
      discount_minor: 0,
      tax_minor: Number(args.taxMinor || 0),
      grand_total_minor: Number(args.grandMinor) || 0,

      delivery_method: args.deliveryMethod ?? "standard",
      items,

      payment: {
        provider,
        provider_txn_id,
        amount_minor: Number(args.grandMinor) || 0,
        currency: args.currency,
        status: "captured",
        captured_at: Math.floor(Date.now() / 1000),

        payment_method,
        card_brand,
        card_last4,

        raw,
      },

      meta: {
        step: "payment",
        path: "/checkout",
        billing_address: billingMeta,
      },

      notes: null,
    };

    console.log("[orders] POST /api/orders body.payment =", body.payment);
    console.log("[orders] POST /api/orders body.items[0] preview =", body.items?.[0]);

    const res = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(body),
    });

    let data: any = null;
    let text: string | null = null;
    try {
      data = await res.clone().json();
    } catch {
      try {
        text = await res.text();
      } catch {}
    }

    if (res.ok && data?.ok && data?.order && typeof data.order.id === "number") {
      console.log("[orders] server created order =", data.order);
      return {
        ok: true,
        order: {
          id: data.order.id,
          order_number: data.order.order_number ?? null,
        },
      };
    }

    console.warn("[orders] server error:", { status: res.status, data, text });
    return { ok: false };
  } catch (e) {
    console.warn("[orders] persist error:", e);
    return { ok: false };
  }
}

/* ---------------- Page ---------------- */
export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { cart, setCart, itemsCount, hasItems, clearCart } = useCart();

  // ✅ 统一表单级提示（用于 Continue 下方提示：Bag / Address）
  const formAlert = useFormAlert();

  // 勾选 & 邮箱本地状态
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [emailInput, setEmailInput] = useState<string>("");

  // 登录态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const readLoginFromCookie = () => {
    const has = isLoggedInViaCookie();
    setIsLoggedIn(has);
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

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");
  const [isPayProcessing, setIsPayProcessing] = useState(false);

  const initialStepFromURL = (() => {
    const s = searchParams.get("step");
    return isStepKey(s) ? (s as StepKey) : ("bag" as StepKey);
  })();
  const [step, setStep] = useState<StepKey>(initialStepFromURL);

  const setStepAndURL = (next: StepKey) => {
    setStep(next);
    const p = new URLSearchParams(window.location.search);
    p.set("step", next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    setContinueErrMsg(null);
  };

  useEffect(() => {
    const hosts = [
      "https://www.paypal.com",
      "https://www.paypalobjects.com",
      "https://assets.braintreegateway.com",
      "https://client-analytics.braintreegateway.com",
    ];
    hosts.forEach((h) => {
      if (!document.querySelector(`link[rel="preconnect"][href="${h}"]`)) {
        const pre = document.createElement("link");
        pre.rel = "preconnect";
        pre.href = h;
        pre.crossOrigin = "anonymous";
        document.head.appendChild(pre);
      }
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${h}"]`)) {
        const dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = h;
        document.head.appendChild(dns);
      }
    });
  }, []);

  useEffect(() => {
    try {
      const rawAddr = localStorage.getItem(LS_ADDRESS_KEY);
      if (rawAddr) {
        const a = JSON.parse(rawAddr);
        setAddress((prev) => (Object.keys(prev || {}).length ? prev : a));
        setEmailInput(a?.email || "");
      }
    } catch {}

    readLoginFromCookie();

    (async () => {
      if (isLoggedInViaCookie()) {
        const authedEmail = await fetchAuthedEmail();
        if (authedEmail) {
          setEmailInput((prev) => prev || authedEmail);
          setAddress((a) => {
            if (a.email) return a;
            const next = { ...a, email: authedEmail };
            try {
              localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }
    })();

    window.addEventListener("focus", readLoginFromCookie);
    return () => window.removeEventListener("focus", readLoginFromCookie);
  }, [setAddress]);

  const {
    currency,
    itemsMinor,
    itemsMajor,
    savedMajor,
    deliveryFeeMajor,
    deliveryFeeMinor,
    totalMinor,
    totalMajor,
    amountInMajorUnit,
  } = usePricing(
    cart,
    hasItems,
    DISPLAY_CURRENCY,
    DELIVERY_FREE_THRESHOLD,
    DELIVERY_FLAT
  );

  const nextStepCore = () => {
    setStepAndURL(
      step === "bag" ? "address" : step === "address" ? "delivery" : "payment"
    );
  };
  const prevStep = () => {
    setStepAndURL(
      step === "payment" ? "delivery" : step === "delivery" ? "address" : "bag"
    );
  };

  const clientTZ =
    (typeof Intl !== "undefined" &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "UTC";
  const clientUTCOffsetMin = -new Date().getTimezoneOffset();
  const FORCE_CN_TZ = "Asia/Shanghai";

  async function sendSubscriptionIfNeeded(emailRaw?: string) {
    try {
      const email = (emailRaw || address?.email || "").trim().toLowerCase();
      if (!email) return;

      const payload = {
        email,
        marketing_opt_in: !!marketingOptIn,
        source: "checkout",
        tz: FORCE_CN_TZ,
        meta: {
          path: "/checkout",
          step,
          ts: Date.now(),
          tz: FORCE_CN_TZ,
          client_tz: clientTZ,
          utc_offset_min: clientUTCOffsetMin,
        },
      };

      const jsonBlob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });

      if (REMOTE_BASE) {
        const ok =
          typeof navigator !== "undefined" &&
          navigator.sendBeacon?.(`${REMOTE_BASE}/subscribe`, jsonBlob);
        if (ok) return;
      }
      const okLocal =
        typeof navigator !== "undefined" &&
        navigator.sendBeacon?.(apiURL("/subscribe"), jsonBlob);
      if (okLocal) return;

      setTimeout(() => {
        const target = REMOTE_BASE ? `${REMOTE_BASE}/subscribe` : apiURL("/subscribe");
        fetch(target, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }, 0);
    } catch {}
  }

  const handleContinue = () => {
    if (step === "bag") {
      if (!hasItems || (cart?.length || 0) === 0) {
        setContinueErrMsg(
          "Your bag is empty. Please add at least one item before continuing."
        );
        return;
      }
      setContinueErrMsg(null);
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
    }

    nextStepCore();
  };

  const handlePaySucceeded = async (payload?: any) => {
    console.log("[checkout] handlePaySucceeded() payload =", payload);

    setIsPayProcessing(true);
    let orderId: number | null = null;
    let orderNumber: string | null = null;

    let orderAddress = { ...address };
    if (
      (!orderAddress.email || !EMAIL_RE.test((orderAddress.email || "").trim())) &&
      isLoggedIn
    ) {
      const authedEmail = await fetchAuthedEmail();
      if (authedEmail) {
        orderAddress.email = authedEmail;
        setAddress(orderAddress);
        setEmailInput((prev) => prev || authedEmail);
        try {
          localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(orderAddress));
        } catch {}
      }
    }

    try {
      const provider: "paypal" | "braintree" =
        payload &&
        (payload.paymentMethod ||
          payload.cardBrand ||
          payload.cardLast4 ||
          payload.provider === "braintree")
          ? "braintree"
          : "paypal";

      console.log("[checkout] determined provider for persist =", provider);

      const persist = await sendOrderToServer({
        cart,
        address: orderAddress,
        currency,
        itemsMinor,
        deliveryFeeMinor,
        taxMinor: 0,
        grandMinor: totalMinor,
        payment: payload,
        paymentProvider: provider,
        deliveryMethod,
        billingAddress,
        sameAsDelivery,
      });

      console.log("[checkout] sendOrderToServer result =", persist);

      if (persist.ok && persist.order) {
        orderId = persist.order.id ?? null;
        orderNumber = persist.order.order_number ?? null;
      }
    } catch (e) {
      console.warn("[checkout] /orders persist failed (will continue to confirmation)", e);
    }

    try {
      sessionStorage.setItem(
        "last-order-preview",
        JSON.stringify({
          ts: Date.now(),
          orderId,
          orderNumber,
          currency,
          totalMinor,
          items: cart,
          address: orderAddress,
          deliveryMethod,
          payload: payload ?? null,
        })
      );
    } catch {}

    clearCart();

    sendSubscriptionIfNeeded().finally(() => {
      router.push(CONFIRM_PATH);
    });
  };

  const handlePayInitiated = () => {
    void sendSubscriptionIfNeeded();
  };

  const handleLoginAndContinue = () => {
    const next = "/checkout?step=address";
    router.push(`/auth/login?next=${encodeURIComponent(next)}`);
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
              deliveryFlat={DELIVERY_FLAT}
              amountInMajorUnit={amountInMajorUnit}
            />
          )}

          {step === "address" && (
            <AddressStep
              isLoggedIn={isLoggedIn}
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
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              sendSubscriptionIfNeeded={sendSubscriptionIfNeeded}
            />
          )}

          {step === "delivery" && (
            <DeliveryStep
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
              showFreeShipping={hasItems && itemsMajor >= DELIVERY_FREE_THRESHOLD}
            />
          )}

          <PaymentStep
            visible={step === "payment"}
            amountInMajorUnit={amountInMajorUnit}
            isPayProcessing={isPayProcessing}
            address={address}
            itemsCount={itemsCount}
            itemsMinor={itemsMinor}
            deliveryFeeMinor={deliveryFeeMinor}
            totalMinor={totalMinor}
            currency={currency}
            onPayInitiated={handlePayInitiated}
            onPaySucceeded={handlePaySucceeded}
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
                  <LargePrimaryButton onClick={handleContinue}>
                    Continue
                  </LargePrimaryButton>
                </div>
              )}
            </div>

            {(step === "bag" || step === "address") &&
            formAlert.hasAlert &&
            formAlert.alert?.message ? (
              <div className="mt-2 flex justify-end">
                <div
                  className={
                    step === "bag"
                      ? "w-[320px] max-w-full"
                      : "w-[660px] max-w-full"
                  }
                >
                  <Alert variant={alertVariant as any}>
                    {formAlert.alert.message}
                  </Alert>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

/* ---------------- 行组件 ---------------- */
function Row({
  label,
  value,
  strongLeft,
  strongRight,
  bigRight,
  valueClass,
}: {
  label: string;
  value: string;
  strongLeft?: boolean;
  strongRight?: boolean;
  bigRight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className={[strongLeft ? "font-semibold" : "text-neutral-600"].join(" ")}>
        {label}
      </div>
      <div
        className={[
          strongRight ? "font-semibold" : "",
          bigRight ? "text-lg" : "text-base",
          valueClass || "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
