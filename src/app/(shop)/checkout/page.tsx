// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageBack from "@/components/PageBack";
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
import { coerceCountryCode } from "@/lib/country";
import { mediaUrl } from "@/lib/strapi";

/* ---------------- 常量 ---------------- */
const LS_ADDRESS_KEY = "sp.checkout.address";

/**
 * 这些常量可以暂时保留用于 UI fallback，
 * 但 delivery fee 以 server-side quote 为准。
 */
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

const DISPLAY_CURRENCY: Currency = "AUD";
const CONFIRM_PATH = "/order/confirmation";

/* 工具：本地 /api 优先（需要远端时单独指定） */
const apiURL = (path: string) => `/api${path}`;
const REMOTE_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");


// ===============================
// ✅ Pre-reserve (prefetch) for faster payment step
// - 在 address/delivery 阶段提前 reserve，让 payment 几乎秒开
// ===============================

type ReserveAPIResp = {
  ok: boolean;
  reservation_id?: string;
  expires_at?: number; // worker 返回 UNIX 秒
  ttl_seconds?: number;
  error?: string;
  message?: string;
  detail?: any;
};

const SS_RESERVE_KEY = "sp.checkout.reserve.v1"; // sessionStorage key

type ReserveCache = {
  reservation_id: string;
  expires_at_sec: number; // UNIX 秒
  cart_hash: string;
  ts: number; // 写入时间 ms
};

// 预加载触发 step：进入这些 step 就开始 reserve
const SHOULD_PREFETCH_RESERVE_STEPS: StepKey[] = ["address"];

// 去抖：购物车连续变动时，最后一次变动才触发 reserve
const RESERVE_DEBOUNCE_MS = 700;

// ✅ 修法2：不做续租窗口；只要没过期就复用
const RESERVE_RENEW_WINDOW_SEC = 0;

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

  // ✅ 修法2：防止在 address step 里重复触发 enter_address reserve
  const didEnterAddressReserveRef = useRef(false);

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
    setStep(next);
    const p = new URLSearchParams(window.location.search);
    p.set("step", next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    setContinueErrMsg(null);

    // ✅ 清掉 payment persist 错误提示（避免残留）
    if (next !== "payment") setPayPersistErrMsg(null);
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
        const a = JSON.parse(rawAddr) as any;

        // ✅ Step 3-B: country 统一清洗成 ISO2（AU/NZ/...）
        const countryCode = coerceCountryCode(a?.country, "AU");
        const cleaned = { ...a, country: countryCode };

        try {
          localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(cleaned));
        } catch {}

        setAddress((prev) => (Object.keys(prev || {}).length ? prev : cleaned));
        setEmailInput(cleaned?.email || "");
      }
    } catch {}

    readLoginFromCookie();

    (async () => {
      if (isLoggedInViaCookie()) {
        const authedEmail = await fetchAuthedEmail();
        if (authedEmail) {
          setEmailInput((prev) => prev || authedEmail);
          setAddress((a) => {
            const ensuredCountry = coerceCountryCode((a as any)?.country, "AU");
            const base = { ...(a as any), country: ensuredCountry };

            if (base.email) return base;
            const next = { ...base, email: authedEmail };

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

  // 旧 hook 仍然用于 itemsMinor / itemsMajor（delivery fee 下面会用 server quote 覆盖）
  const pricing = usePricing(cart, hasItems, DISPLAY_CURRENCY, DELIVERY_FREE_THRESHOLD, DELIVERY_FLAT);
  const {
    currency,
    itemsMinor,
    itemsMajor,
    savedMajor,
    deliveryFeeMajor: deliveryFeeMajorFallback,
    deliveryFeeMinor: deliveryFeeMinorFallback,
    totalMinor: totalMinorFallback,
    totalMajor: totalMajorFallback,
    amountInMajorUnit: amountInMajorUnitFallback,
  } = pricing;

  // ===============================
  // ✅ NEW: server-side shipping quote state (fetch BOTH standard + express)
  // ===============================
  type ShippingQuoteAPIResult = {
    ok: boolean;
    zone_code?: string;
    currency?: string;
    delivery_fee_minor?: number;

    // ✅ 你后端 quote.ts 下一步要返回的字段（用于横幅显示）
    standard_free_unlocked?: boolean;
    standard_free_threshold_minor?: number;

    error?: string;
  };

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [quoteByMethod, setQuoteByMethod] = useState<
    Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>
  >({});
  const [lastQuoteMeta, setLastQuoteMeta] = useState<any | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const quoteReqKey = useMemo(() => {
    const country = (address?.country || "").trim();
    const state = (address?.state || "").trim();
    const postcode = (address?.postcode || "").trim();
    return JSON.stringify({
      hasItems: !!hasItems,
      itemsMinor: Number(itemsMinor) || 0,
      country,
      state,
      postcode,
    });
  }, [address?.country, address?.state, address?.postcode, hasItems, itemsMinor]);


  // ===============================
  // ✅ Reserve helpers
  // ===============================

  // ✅ 从 cart 提取 reserve items（兼容你 cart 结构）
  function cartToReserveItems(cartAny: any[]): Array<{ sku: string; qty: number }> {
    const list = Array.isArray(cartAny) ? cartAny : [];
    const out: Array<{ sku: string; qty: number }> = [];

    for (const it of list) {
      const sku = String((it as any)?.product_sku ?? (it as any)?.sku ?? "").trim();
      const qtyRaw = Number((it as any)?.qty ?? (it as any)?.quantity ?? 1);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
      if (!sku) continue;
      out.push({ sku, qty });
    }

    // 合并同 sku
    const merged = new Map<string, number>();
    for (const x of out) merged.set(x.sku, (merged.get(x.sku) ?? 0) + x.qty);

    return Array.from(merged.entries()).map(([sku, qty]) => ({ sku, qty }));
  }

  // ✅ cart_hash 生成规则：sku:qty 排序后用 | 拼接（与你 worker genCartHash 对齐）
  function buildCartHash(items: Array<{ sku: string; qty: number }>): string {
    return items
      .map((x) => `${String(x.sku).trim()}:${Math.max(1, Math.floor(Number(x.qty) || 1))}`)
      .sort()
      .join("|");
  }

  const cartHash = useMemo(() => {
    if (!hasItems) return "";
    const items = cartToReserveItems(cart);
    if (!items.length) return "";
    return buildCartHash(items);
  }, [cart, hasItems]);

  function readReserveCache(): ReserveCache | null {
    try {
      const raw = sessionStorage.getItem(SS_RESERVE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw) as any;
      const rid = String(obj?.reservation_id ?? "").trim();
      const exp = Number(obj?.expires_at_sec ?? 0);
      const ch = String(obj?.cart_hash ?? "").trim();
      if (!rid || !Number.isFinite(exp) || exp <= 0 || !ch) return null;
      return {
        reservation_id: rid,
        expires_at_sec: Math.floor(exp),
        cart_hash: ch,
        ts: Number(obj?.ts ?? Date.now()),
      };
    } catch {
      return null;
    }
  }

  function writeReserveCache(next: ReserveCache) {
    try {
      sessionStorage.setItem(SS_RESERVE_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearReserveCache() {
    try {
      sessionStorage.removeItem(SS_RESERVE_KEY);
    } catch {}
  }


  // ===============================
  // ✅ Reserve prefetch core
  // ===============================

  async function doPrefetchReserve(reason: string, force = false) {
  if (!hasItems) return;

  const items = cartToReserveItems(cart);
  if (!items.length) return;

  const cart_hash = buildCartHash(items);

  // key to dedupe requests
  const reserveKey = `${cart_hash}`;

  // ✅ 1) try reuse cache (sessionStorage)
  const nowSec = Math.floor(Date.now() / 1000);
  const cached = readReserveCache();
  if (!force && cached && cached.cart_hash === cart_hash) {
  const secLeft = cached.expires_at_sec - nowSec;

  // ✅ 修法2：只要还没过期（留 1 秒余量）就复用，不做“快过期就续租”
  if (secLeft > 1) {
    setReservationId(cached.reservation_id);
    setReservationExpiresAtSec(cached.expires_at_sec);
    setReservationCartHash(cached.cart_hash);
    setReserveErr(null);
    setReserveLoading(false);
    return;
  }
}

  // ✅ 2) avoid duplicating same reserve in flight
  if (!force && lastReserveKeyRef.current === reserveKey && reserveLoading) return;
  lastReserveKeyRef.current = reserveKey;

  // ✅ 3) abort previous
  try {
    reserveAbortRef.current?.abort();
  } catch {}
  const ac = new AbortController();
  reserveAbortRef.current = ac;

  // ✅ 4) call reserve API
  setReserveLoading(true);
  setReserveErr(null);

  // stable request_id: keep within this browser tab/session
  const reqIdKey = "sp.checkout.reserve.reqid.v1";
  let request_id = "";
  try {
    request_id = sessionStorage.getItem(reqIdKey) || "";
    if (!request_id) {
      request_id = `rid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      sessionStorage.setItem(reqIdKey, request_id);
    }
  } catch {}

  try {
    const res = await fetch(apiURL("/stock/reserve"), {
      method: "POST",
      credentials: "include",
      signal: ac.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items,
        request_id: `${request_id}:${cart_hash}`,
        cart_hash,
      }),
    });

    const data = (await res.json().catch(() => null)) as ReserveAPIResp | null;

    if (!res.ok || !data || data.ok !== true) {
      const err = String(data?.error || `reserve_http_${res.status}`);
      const msg = String(data?.message || err);
      setReserveErr(msg);
      setReserveLoading(false);

      clearReserveCache();
      setReservationId(null);
      setReservationExpiresAtSec(null);
      setReservationCartHash(null);
      return;
    }

    const rid = String(data.reservation_id || "").trim();
    const expSec = Number(data.expires_at ?? 0);

    if (!rid || !Number.isFinite(expSec) || expSec <= 0) {
      setReserveErr("reserve_invalid_response");
      setReserveLoading(false);

      clearReserveCache();
      setReservationId(null);
      setReservationExpiresAtSec(null);
      setReservationCartHash(null);
      return;
    }

    const nextCache: ReserveCache = {
      reservation_id: rid,
      expires_at_sec: Math.floor(expSec),
      cart_hash,
      ts: Date.now(),
    };

    writeReserveCache(nextCache);

    setReservationId(rid);
    setReservationExpiresAtSec(nextCache.expires_at_sec);
    setReservationCartHash(cart_hash);
    setReserveErr(null);
    setReserveLoading(false);

    // ✅ auto-renew close to expiry (best-effort)
   
  } catch (e: any) {
    if (String(e?.name) === "AbortError") return;

    setReserveErr(String(e?.message || e || "reserve_failed"));
    setReserveLoading(false);

    clearReserveCache();
    setReservationId(null);
    setReservationExpiresAtSec(null);
    setReservationCartHash(null);
  }
}

  function schedulePrefetchReserve(reason: string, force = false) {
    try {
      if (reserveTimerRef.current) clearTimeout(reserveTimerRef.current);
    } catch {}

    reserveTimerRef.current = setTimeout(() => {
      void doPrefetchReserve(reason, force);
    }, RESERVE_DEBOUNCE_MS);
  }

  async function fetchOneQuote(args: {
    delivery_option: DeliveryMethod;
    country: string;
    state: string | null;
    postcode: string | null;
    items_total_minor: number;
    signal: AbortSignal;
  }): Promise<ShippingQuoteAPIResult> {
    const target = apiURL("/shipping/quote");
    const res = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      signal: args.signal,
      body: JSON.stringify({
        country: args.country,
        state: args.state,
        postcode: args.postcode,
        delivery_option: args.delivery_option,
        items_total_minor: args.items_total_minor,
      }),
    });

    const data = (await res.json().catch(() => null)) as any;

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || `quote_failed_status_${res.status}`,
      };
    }

    return data as ShippingQuoteAPIResult;
  }

  async function fetchShippingQuotesBoth() {
    if (!hasItems) {
      setQuoteByMethod({});
      setLastQuoteMeta(null);
      setQuoteError(null);
      return;
    }

    const country = (address?.country || "").trim() || "AU";
    const state = (address?.state || "").trim() || null;
    const postcode = (address?.postcode || "").trim() || null;

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      abortRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const total = Number(itemsMinor) || 0;

      const [qStandard, qExpress] = await Promise.all([
        fetchOneQuote({
          delivery_option: "standard",
          country,
          state,
          postcode,
          items_total_minor: total,
          signal: ac.signal,
        }),
        fetchOneQuote({
          delivery_option: "express",
          country,
          state,
          postcode,
          items_total_minor: total,
          signal: ac.signal,
        }),
      ]);

      const next: Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>> = {
        standard: qStandard,
        express: qExpress,
      };

      setQuoteByMethod(next);
      setLastQuoteMeta(deliveryMethod === "express" ? qExpress : qStandard);

      const anyFail = !qStandard.ok || !qExpress.ok;
      if (anyFail) {
        const msg =
          (!qStandard.ok ? `standard: ${qStandard.error || "failed"}` : "") +
          (!qStandard.ok && !qExpress.ok ? " | " : "") +
          (!qExpress.ok ? `express: ${qExpress.error || "failed"}` : "");
        setQuoteError(msg || "quote_failed");
      } else {
        setQuoteError(null);
      }
    } catch (e: any) {
      if (String(e?.name) === "AbortError") return;
      setQuoteError(String(e?.message || e || "quote_failed"));
      setQuoteByMethod({});
      setLastQuoteMeta(null);
    } finally {
      setQuoteLoading(false);
    }
  }

  useEffect(() => {
    void fetchShippingQuotesBoth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteReqKey]);


  // ✅ 进入 Address step 时：触发一次 reserve（把预留提前到 Address）
  useEffect(() => {
  if (!hasItems) return;

  if (step === "address") {
    // ✅ 只在第一次进入 address 时触发一次 reserve
    if (!didEnterAddressReserveRef.current) {
      didEnterAddressReserveRef.current = true;
      void doPrefetchReserve("enter_address", false);
    }
    return;
  }

  // ✅ 离开 address 后，允许下次再进入 address 时重新触发一次
  didEnterAddressReserveRef.current = false;

  if (step === "bag") {
    clearReserveCache();
    setReservationId(null);
    setReservationExpiresAtSec(null);
    setReservationCartHash(null);
    setReserveErr(null);
    setReserveLoading(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [step, hasItems]);


  // ✅ cart 变化时：
  // - 清理旧 reservation（hash 已变化）
  // - 如果用户正处于 Address step，则去抖触发一次 reserve
  useEffect(() => {
  if (!hasItems) {
    lastCartHashRef.current = "";
    setReservationId(null);
    setReservationExpiresAtSec(null);
    setReservationCartHash(null);
    setReserveErr(null);
    setReserveLoading(false);
    clearReserveCache();
    return;
  }

  // ✅ 只有 cart_hash 真变化才认为“cart 变了”
  const nextHash = cartHash || "";
  const prevHash = lastCartHashRef.current;

  if (!nextHash || nextHash === prevHash) {
    return;
  }

  lastCartHashRef.current = nextHash;

  // cart hash 变了：旧 reservation 不可信（先清理）
  setReservationId(null);
  setReservationExpiresAtSec(null);
  setReservationCartHash(null);
  setReserveErr(null);
  setReserveLoading(false);
  clearReserveCache();

  if (step === "address") {
    schedulePrefetchReserve("cart_changed", false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [cartHash, hasItems, step]);

  // ✅ 卸载清理：abort + clear timers
  useEffect(() => {
    return () => {
      try {
        reserveAbortRef.current?.abort();
      } catch {}

      try {
        if (reserveTimerRef.current) clearTimeout(reserveTimerRef.current);
      } catch {}


    };
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
    setStepAndURL(step === "bag" ? "address" : step === "address" ? "delivery" : "payment");
  };
  const prevStep = () => {
    setStepAndURL(step === "payment" ? "delivery" : step === "delivery" ? "address" : "bag");
  };

  const clientTZ =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
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
        typeof navigator !== "undefined" && navigator.sendBeacon?.(apiURL("/subscribe"), jsonBlob);
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
        setContinueErrMsg("Your bag is empty. Please add at least one item before continuing.");
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
              deliveryFlat={deliveryFeeMajorEffective}
              amountInMajorUnit={amountInMajorUnitEffective}
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
              />

              {quoteLoading ? (
                <div className="text-sm text-neutral-500">Calculating shipping…</div>
              ) : quoteError ? (
                <div className="text-sm text-amber-600">
                  Shipping quote unavailable (fallback applied). ({quoteError})
                </div>
              ) : quoteByMethod?.[deliveryMethod]?.ok ? (
                <div className="text-sm text-neutral-500">
                  Shipping matched: {quoteByMethod?.[deliveryMethod]?.zone_code ?? "?"} · option{" "}
                  {deliveryMethod} · fee{" "}
                  {((Number(quoteByMethod?.[deliveryMethod]?.delivery_fee_minor ?? 0) || 0) / 100).toFixed(2)}{" "}
                  {currency}
                </div>
              ) : null}
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
