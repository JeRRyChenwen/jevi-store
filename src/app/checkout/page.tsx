// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";

import BraintreePayPalOnly from "@/app/checkout/_components/BraintreePayPalOnly";
import PrefetchBraintreeToken from "@/app/checkout/_components/PrefetchBraintreeToken";
import PayPalPreloader from "@/app/checkout/_components/PayPalPreloader";

import { selectCurrencyAndTotals } from "@/lib/cartPricing";
import { effectiveMinor, type PriceRec, type Currency } from "@/lib/pricing";

type CartItem = CartListItem;

/* ---------------- 常量 ---------------- */
const LS_CART_KEY = "bag:v1";
const LS_ADDRESS_KEY = "sp.checkout.address";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;
const DISPLAY_CURRENCY: Currency = "AUD";
const CONFIRM_PATH = "/order/confirmation";

/* 工具：本地 /api 优先（需要远端时单独指定） */
const apiURL = (path: string) => `/api${path}`;
const REMOTE_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/* ---------------- 小工具 ---------------- */
function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtMoneyMinor(minor: number, currency: string, locale?: string) {
  return fmtPrice((minor ?? 0) / 100, currency, locale);
}

/* ====== 校验正则 & 工具（Address Line 2、marketing 勾选不校验） ====== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;
const POSTCODE_RE = /^[A-Za-z0-9\s\-]{3,10}$/;
const t = (s?: string) => (s || "").trim();

type Address = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  line2?: string; // optional
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type AddressErr = {
  firstName: boolean;
  lastName: boolean;
  phone: boolean;
  line1: boolean;
  city: boolean;
  state: boolean;
  postcode: boolean;
  country: boolean;
  email: boolean;
};

const emptyErr: AddressErr = {
  firstName: false,
  lastName: false,
  phone: false,
  line1: false,
  city: false,
  state: false,
  postcode: false,
  country: false,
  email: false,
};

/** ✅ 新增：允许在“已登录”时不校验邮箱 */
function validateAddress(a: Address, emailInput: string, ignoreEmail = false) {
  const errs: AddressErr = {
    firstName: t(a.firstName) === "",
    lastName: t(a.lastName) === "",
    phone: !PHONE_RE.test(t(a.phone)),
    line1: t(a.line1) === "",
    city: t(a.city) === "",
    state: t(a.state) === "",
    postcode: !POSTCODE_RE.test(t(a.postcode)),
    country: t(a.country) === "",
    email: ignoreEmail ? false : !EMAIL_RE.test(t(emailInput || a.email)),
  };
  const valid = Object.values(errs).every((v) => v === false);
  return { valid, errs };
}

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
                isLocked ? "cursor-default opacity-50 pointer-events-auto" : "cursor-pointer",
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

/* ---------------- Address 表单 ---------------- */
function AddressForm({
  address,
  setAddress,
  emailInput,
  setEmailInput,
  marketingOptIn,
  setMarketingOptIn,
  showErrors,
  errs,
  errorBanner,
  onEmailCommit,
  onOptInChanged,
  /** ✅ 新增：已登录时隐藏“Your Details”区块与营销勾选 */
  hideYourDetails = false,
}: {
  address: Address;
  setAddress: (a: Address) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  showErrors: boolean;
  errs: AddressErr;
  errorBanner?: string | null;
  onEmailCommit?: (email: string) => void;
  onOptInChanged?: (opt: boolean) => void;
  hideYourDetails?: boolean;
}) {
  const on =
    (k: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setAddress({ ...address, [k]: e.target.value });

  const baseInput =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10";
  const cls = (bad: boolean) =>
    showErrors && bad ? `${baseInput} border-red-500` : `${baseInput} border-neutral-300`;

  return (
    <section className="rounded-xl border" id="address-section">
      <div className="border-b px-4 py-3 font-semibold">Address</div>

      <div className="p-4 space-y-6">
        {/* 表单主体 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="addr-first" className="block text-sm font-medium text-neutral-700">
              First Name
            </label>
            <input
              id="addr-first"
              className={cls(errs.firstName)}
              autoComplete="given-name"
              value={address.firstName || ""}
              onChange={on("firstName")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-last" className="block text-sm font-medium text-neutral-700">
              Last Name
            </label>
            <input
              id="addr-last"
              className={cls(errs.lastName)}
              autoComplete="family-name"
              value={address.lastName || ""}
              onChange={on("lastName")}
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="addr-phone" className="block text-sm font-medium text-neutral-700">
              Phone
            </label>
            <input
              id="addr-phone"
              className={cls(errs.phone)}
              autoComplete="tel"
              value={address.phone || ""}
              onChange={on("phone")}
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="addr-line1" className="block text-sm font-medium text-neutral-700">
              Address Line 1
            </label>
            <input
              id="addr-line1"
              className={cls(errs.line1)}
              autoComplete="address-line1"
              value={address.line1 || ""}
              onChange={on("line1")}
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="addr-line2" className="block text-sm font-medium text-neutral-700">
              Address Line 2 (optional)
            </label>
            <input
              id="addr-line2"
              className={baseInput + " border-neutral-300"}
              autoComplete="address-line2"
              value={address.line2 || ""}
              onChange={on("line2")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-city" className="block text-sm font-medium text-neutral-700">
              City
            </label>
            <input
              id="addr-city"
              className={cls(errs.city)}
              autoComplete="address-level2"
              value={address.city || ""}
              onChange={on("city")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-state" className="block text-sm font-medium text-neutral-700">
              State/Region
            </label>
            <input
              id="addr-state"
              className={cls(errs.state)}
              autoComplete="address-level1"
              value={address.state || ""}
              onChange={on("state")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-postcode" className="block text-sm font-medium text-neutral-700">
              Postcode
            </label>
            <input
              id="addr-postcode"
              className={cls(errs.postcode)}
              autoComplete="postal-code"
              value={address.postcode || ""}
              onChange={on("postcode")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-country" className="block text-sm font-medium text-neutral-700">
              Country
            </label>
            <input
              id="addr-country"
              className={cls(errs.country)}
              autoComplete="country-name"
              value={address.country || ""}
              onChange={on("country")}
            />
          </div>
        </div>

        {/* ✅ 已登录则隐藏 “Your Details” 区域 */}
        {!hideYourDetails && (
          <div className="border rounded-lg p-4">
            <h3 className="text-base font-medium mb-2">Your Details</h3>
            <p className="text-sm text-neutral-600 mb-3">
              Please enter your email address, we'll send your order confirmation here
            </p>

            <label htmlFor="addr-email" className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              id="addr-email"
              type="email"
              className={cls(errs.email)}
              autoComplete="email"
              value={emailInput}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setEmailInput(v);
                setAddress({ ...address, email: v });
              }}
              onBlur={(e) => onEmailCommit?.(e.currentTarget.value)}
            />

            <p className="mt-1 text-xs text-neutral-500">You can create an account after checkout</p>

            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={marketingOptIn}
                onChange={(e) => {
                  const v = e.currentTarget.checked;
                  setMarketingOptIn(v);
                  onOptInChanged?.(v);
                }}
              />
              <span>Email me updates on New Arrivals, Sale and Offers</span>
            </label>

            <p className="mt-3 text-xs text-neutral-500">
              * We treat your personal data with care, view our{" "}
              <a className="underline" href="/privacy">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        )}

        {/* 提交时错误提示（英文） */}
        {showErrors && errorBanner && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {errorBanner}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Delivery ---------------- */
type DeliveryMethod = "standard" | "express";
const METHOD_META: Record<DeliveryMethod, { label: string; eta: string }> = {
  standard: { label: "Standard delivery", eta: "Arrives in 3–5 business days" },
  express: { label: "Express delivery", eta: "Arrives in 1–2 business days" },
};
function DeliverySection({
  deliveryMethod,
  setDeliveryMethod,
}: {
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (v: DeliveryMethod) => void;
}) {
  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3 font-semibold">Delivery</div>
      <div className="p-4 space-y-3">
        {(["standard", "express"] as DeliveryMethod[]).map((m) => (
          <label
            key={m}
            className="flex items-start gap-3 rounded-lg border p-3 has-[:checked]:border-neutral-900 cursor-pointer"
          >
            <input
              type="radio"
              name="deliveryMethod"
              className="mt-1"
              checked={deliveryMethod === m}
              onChange={() => setDeliveryMethod(m)}
            />
            <div className="flex-1">
              <div className="font-medium">{METHOD_META[m].label}</div>
              <div className="text-sm text-neutral-600">{METHOD_META[m].eta}</div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 价格工具 ---------------- */
function itemToPriceRecs(it: any): PriceRec[] {
  if (Array.isArray(it?.prices) && it.prices.length) {
    return it.prices
      .map((p: any) => {
        const currency = String(p?.currency || "").toUpperCase() as Currency;
        const amount = Math.max(0, Math.round(Number(p?.price) || 0));
        const rec: PriceRec = { currency, amount_minor: amount, price: amount };
        if (p?.discount_percent_off != null) rec.discount_percent_off = Number(p.discount_percent_off);
        if (p?.sale_starts_at) rec.sale_starts_at = String(p.sale_starts_at);
        if (p?.sale_ends_at) rec.sale_ends_at = String(p.sale_ends_at);
        return rec;
      })
      .filter((r: PriceRec) => Number.isInteger((r as any).price ?? r.amount_minor));
  }
  const currency = String(it?.currency || "AUD").toUpperCase() as Currency;
  const priceMajor = Number(it?.price) || 0;
  const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
  const priceMinor = Math.max(0, Math.round(priceMajor * 100));
  const baseMinor = Math.max(0, Math.round(baseMajor * 100));
  const base = baseMinor || priceMinor;
  const rec: PriceRec = { currency, amount_minor: base, price: base };
  if (baseMinor > priceMinor && baseMinor > 0) {
    const off = Math.round((1 - priceMinor / baseMinor) * 100);
    rec.discount_percent_off = Math.max(0, off);
  }
  return [rec];
}
const baseOf = (r: PriceRec) => Math.max(0, Number((r as any).price ?? r.amount_minor ?? 0));

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
/** ✅ 新增：白色“Login / Sign up and Continue”按钮样式 */
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

  const [loaded, setLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<Address>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");

  // 勾选 & 邮箱本地状态
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [emailInput, setEmailInput] = useState<string>("");

  // ✅ 新增：登录态（读取 presence/session cookie）
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const readLoginFromCookie = () => {
    const cookie = typeof document !== "undefined" ? document.cookie || "" : "";
    const has = /(?:^|;\s*)sp_has_session=1/.test(cookie) || /(?:^|;\s*)sp_session=/.test(cookie);
    setIsLoggedIn(has);
  };

  // Address 提交时校验：是否展示错误、错误对象
  const [addressShowErrors, setAddressShowErrors] = useState(false);
  const [addressErrs, setAddressErrs] = useState<AddressErr>(emptyErr);

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
  };

  // 预连接
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

  // 初始化本地缓存 & 登录态
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    try {
      const rawAddr = localStorage.getItem(LS_ADDRESS_KEY);
      if (rawAddr) {
        const a = JSON.parse(rawAddr);
        setAddress(a);
        setEmailInput(a?.email || "");
      }
    } catch {}
    readLoginFromCookie();
    window.addEventListener("focus", readLoginFromCookie);
    setLoaded(true);
    return () => window.removeEventListener("focus", readLoginFromCookie);
  }, []);

  // 同步购物车 & 广播
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
      const count = cart.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      window.dispatchEvent(new CustomEvent("bag:count", { detail: { count } }));
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {}
  }, [cart, loaded]);

  // 地址写回
  useEffect(() => {
    try {
      localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(address));
    } catch {}
  }, [address]);

  const hasItems = cart.length > 0;

  // 统一用 AUD 计算与展示
  const pricingInput = useMemo(
    () => cart.map((it: any) => ({ qty: Number(it?.qty) || 1, prices: itemToPriceRecs(it) })),
    [cart]
  );

  const itemsTotals = useMemo(() => {
    if (!pricingInput.length)
      return { currency: DISPLAY_CURRENCY as Currency, itemsMinor: 0, itemsMajor: 0 };
    const { currency, totalMinor, totalMajor } = selectCurrencyAndTotals(
      pricingInput,
      DISPLAY_CURRENCY,
      undefined,
      DISPLAY_CURRENCY
    );
    return { currency, itemsMinor: totalMinor, itemsMajor: totalMajor };
  }, [pricingInput]);

  const currency = DISPLAY_CURRENCY as string;

  const savedMajor = useMemo(() => {
    let savedMinor = 0;
    for (const it of cart as any[]) {
      const qty = Number(it?.qty) || 1;
      const recs = itemToPriceRecs(it);
      const rec = recs.find((r) => r.currency === (currency as Currency));
      if (rec) {
        const base = baseOf(rec);
        const eff = effectiveMinor(rec);
        if (eff < base) savedMinor += (base - eff) * qty;
      } else {
        const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
        const priceMajor = Number(it?.price ?? 0);
        if (baseMajor > priceMajor) savedMinor += Math.round((baseMajor - priceMajor) * 100) * qty;
      }
    }
    return savedMinor / 100;
  }, [cart, currency]);

  // 运费 & 总计
  const deliveryFeeMajor =
    hasItems && itemsTotals.itemsMajor < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const deliveryFeeMinor = Math.round(deliveryFeeMajor * 100);
  const totalMinor = itemsTotals.itemsMinor + deliveryFeeMinor;
  const totalMajor = itemsTotals.itemsMajor + deliveryFeeMajor;
  const amountInMajorUnit = Math.max(0, Number(totalMajor.toFixed(2)));

  const nextStepCore = () => {
    setStepAndURL(step === "bag" ? "address" : step === "address" ? "delivery" : "payment");
  };
  const prevStep = () => {
    setStepAndURL(step === "payment" ? "delivery" : step === "delivery" ? "address" : "bag");
  };

  // ---------- 时区标记 ----------
  const clientTZ =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  const clientUTCOffsetMin = -new Date().getTimezoneOffset();
  const FORCE_CN_TZ = "Asia/Shanghai";

  // ✅ 订阅（未登录仍允许；已登录隐藏 Your Details 时基本不会触发）
  async function sendSubscriptionIfNeeded(emailRaw?: string) {
    try {
      const email = (emailRaw || address?.email || emailInput || "").trim().toLowerCase();
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

      const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });

      if (REMOTE_BASE) {
        const ok = typeof navigator !== "undefined" && navigator.sendBeacon?.(`${REMOTE_BASE}/subscribe`, jsonBlob);
        if (ok) return;
      }
      const okLocal = typeof navigator !== "undefined" && navigator.sendBeacon?.(apiURL("/subscribe"), jsonBlob);
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

  // 点击 Continue：Address 步骤改为“提交时校验”
  const handleContinue = () => {
    if (step === "address") {
      const { valid, errs } = validateAddress(address, emailInput, /* ignoreEmail */ isLoggedIn);
      if (!valid) {
        setAddressErrs(errs);
        setAddressShowErrors(true);
        const el = document.getElementById("address-section");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setAddressShowErrors(false);
      setAddressErrs(emptyErr);

      // 未登录时才会上报（通常用于游客）
      if (!isLoggedIn) void sendSubscriptionIfNeeded();
    }
    nextStepCore();
  };

  const itemsCount = cart.reduce((n, it: any) => n + (it?.qty ?? 1), 0);

  // 支付成功 → 确认页
  const handlePaySucceeded = (payload?: any) => {
    try {
      sessionStorage.setItem(
        "last-order-preview",
        JSON.stringify({
          ts: Date.now(),
          currency,
          totalMinor,
          items: cart,
          address,
          deliveryMethod,
          payload: payload ?? null,
        })
      );
    } catch {}

    sendSubscriptionIfNeeded().finally(() => {
      router.push(CONFIRM_PATH);
    });
  };

  const handlePayInitiated = () => {
    void sendSubscriptionIfNeeded();
  };

  // ✅ 新增：登录 / 注册并继续
  const handleLoginAndContinue = () => {
    const next = "/checkout?step=address";
    router.push(`/auth/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      <PrefetchBraintreeToken />
      <PayPalPreloader currency={DISPLAY_CURRENCY as unknown as string} />

      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-5 text-sm text-neutral-600">
          <Link href="/" className="hover:underline">&larr; Back</Link>
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-6">
          {/* Bag */}
          {step === "bag" && (
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">Your Bag</div>
              <div className="p-4">
                <CartList
                  cart={cart}
                  onInc={(k) =>
                    setCart((p) =>
                      p.map((x) =>
                        x.key === k ? { ...x, qty: Math.min(x.qty + 1, x.stock) } : x
                      )
                    )
                  }
                  onDec={(k) =>
                    setCart((p) =>
                      p.map((x) =>
                        x.key === k ? { ...x, qty: Math.max(1, x.qty - 1) } : x
                      )
                    )
                  }
                  onRemove={(k) => setCart((p) => p.filter((x) => x.key !== k))}
                />
              </div>
              <div className="border-t p-4">
                <div className="mb-2 text-sm font-semibold">Order Summary</div>
                <div className="space-y-2 text-sm">
                  <Row label="Subtotal" value={fmtPrice(itemsTotals.itemsMajor, currency)} strongRight />
                  {savedMajor > 0 && (
                    <Row
                      label="You saved"
                      value={fmtPrice(savedMajor, currency)}
                      valueClass="text-emerald-700 font-semibold"
                    />
                  )}
                  {hasItems && (
                    <Row
                      label="Delivery fee"
                      value={
                        itemsTotals.itemsMajor >= DELIVERY_FREE_THRESHOLD
                          ? "FREE for over $100"
                          : fmtPrice(DELIVERY_FLAT, currency)
                      }
                      valueClass={
                        itemsTotals.itemsMajor >= DELIVERY_FREE_THRESHOLD ? "text-emerald-700 font-semibold" : undefined
                      }
                    />
                  )}
                  <div className="pt-1">
                    <Row
                      label="Total"
                      value={fmtPrice(
                        itemsTotals.itemsMajor +
                          (hasItems && itemsTotals.itemsMajor < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0),
                        currency
                      )}
                      strongLeft
                      strongRight
                      bigRight
                    />
                    <div className="mt-1 text-xs text-neutral-500">Including GST</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Address */}
          {step === "address" && (
            <AddressForm
              address={address}
              setAddress={setAddress}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              marketingOptIn={marketingOptIn}
              setMarketingOptIn={setMarketingOptIn}
              showErrors={addressShowErrors}
              errs={addressErrs}
              errorBanner={addressShowErrors ? "Some required fields are missing or invalid." : null}
              onEmailCommit={(email) => sendSubscriptionIfNeeded(email)}
              onOptInChanged={(_opt) => sendSubscriptionIfNeeded()}
              hideYourDetails={isLoggedIn}   // ✅ 已登录隐藏 Your Details
            />
          )}

          {/* Delivery */}
          {step === "delivery" && (
            <>
              {hasItems && itemsTotals.itemsMajor >= DELIVERY_FREE_THRESHOLD && (
                <div className="rounded-xl border px-4 py-3 text-sm">
                  <div className="mb-2 font-medium">Congratulations! You have reached free shipping</div>
                  <div className="h-1 w-full overflow-hidden rounded bg-neutral-200">
                    <div className="h-full w-full bg-emerald-600" />
                  </div>
                </div>
              )}
              <DeliverySection
                deliveryMethod={deliveryMethod}
                setDeliveryMethod={setDeliveryMethod}
              />
            </>
          )}

          {/* Payment：始终挂载；非 payment 时固定在视口内且几乎透明 */}
          <section
            className="rounded-xl border"
            aria-hidden={step !== "payment"}
            style={
              step === "payment"
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
            <div className="px-4 py-3 border-b font-semibold">How would you like to pay?</div>

            <div className="p-4 space-y-6">
              {/* Payment Options（只显示 PayPal 选中） */}
              <div className="border rounded-lg p-4">
                <h2 className="text-lg font-medium mb-4">Payment Options</h2>
                <label className="flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer border-black ring-1 ring-black">
                  <input type="radio" name="payment" className="mt-0.5" checked readOnly />
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <div className="font-medium">PayPal</div>
                    <div className="flex items-center gap-2 opacity-80">
                      <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-5" />
                    </div>
                  </div>
                </label>
              </div>

              {/* 蓝色提示 */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Check size={14} />
                  </span>
                  <div>
                    <div className="font-medium">Make sure your delivery address is correct!</div>
                    <div className="text-gray-600">You can go back to the Address step to make changes.</div>
                  </div>
                </div>
              </div>

              {/* Delivery Details（摘要） */}
              <div className="border rounded-lg p-4">
                <h3 className="text-base font-medium mb-3">Delivery Details</h3>
                {address?.firstName || address?.lastName ? (
                  <div className="text-sm leading-6 text-gray-800">
                    <div>{[address.firstName, address.lastName].filter(Boolean).join(" ")}</div>
                    <div>
                      {address.line1}
                      {address.line2 ? ` ${address.line2}` : ""}
                    </div>
                    <div>
                      {address.city} {address.state} {address.postcode}
                    </div>
                    <div>{address.country}</div>
                    {address.email && <div className="mt-2">{address.email}</div>}
                    {address.phone && <div>{address.phone}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No delivery address found. Please complete the <b>Address</b> step.
                  </div>
                )}
              </div>

              {/* 订单摘要 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Items</div>
                  <div className="text-base font-medium">
                    {itemsCount} item{itemsCount > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Subtotal</div>
                  <div className="text-base font-medium">
                    {fmtMoneyMinor(itemsTotals.itemsMinor, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Delivery</div>
                  <div className="text-base font-medium">
                    {deliveryFeeMinor === 0 ? "FREE" : fmtMoneyMinor(deliveryFeeMinor, currency)}
                  </div>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Total</div>
                  <div className="text-xl font-bold">
                    {fmtMoneyMinor(totalMinor, currency)}
                  </div>
                </div>
              </div>

              {/* PayPal 按钮 */}
              <div className="p-4">
                <div className="mx-auto w-[300px]">
                  {amountInMajorUnit > 0 ? (
                    <BraintreePayPalOnly
                      amount={amountInMajorUnit}
                      currency="AUD"
                      onInitiate={handlePayInitiated}
                      onSucceeded={handlePaySucceeded}
                    />
                  ) : (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 text-center">
                      Your total is $0. Add items to proceed with payment.
                    </div>
                  )}
                </div>
              </div>

              {/* 统一币种提示 */}
              <p className="mt-2 text-xs text-gray-500">
                All charges are processed in <b>AUD</b>. Your bank or PayPal may apply currency conversion and fees.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                * Pay in 4 availability is determined by PayPal and may vary by account and region.
              </p>
            </div>
          </section>

          {/* ✅ Back 按钮在 Payment 区域外、边框下方（只在 payment 步骤显示） */}
          {step === "payment" && (
            <div className="px-4 pb-4 pt-2 flex justify-end">
              <div className="w-[320px] max-w-full">
                <LargeBackButton onClick={() => setStepAndURL("delivery")} />
              </div>
            </div>
          )}
        </div>

        {/* 底部操作条 */}
        {step !== "payment" && (
          <div className="mt-6 flex justify-end">
            {step === "bag" ? (
              // ✅ 未登录：左白右黑；已登录：只显示 Continue
              <div className={isLoggedIn ? "w-[320px] max-w-full" : "w-[660px] max-w-full flex gap-3 justify-end"}>
                {!isLoggedIn && (
                  <div className="w-[320px]">
                    <LargeGhostButton onClick={handleLoginAndContinue}>
                      Login / Sign up and Continue
                    </LargeGhostButton>
                  </div>
                )}
                <div className="w-[320px]">
                  <LargePrimaryButton onClick={handleContinue}>Continue</LargePrimaryButton>
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
      <div className={[strongLeft ? "font-semibold" : "text-neutral-600"].join(" ")}>{label}</div>
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
