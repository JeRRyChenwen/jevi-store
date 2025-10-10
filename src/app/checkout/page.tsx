// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";

// ✅ 只渲染一颗 PayPal 按钮（无外围边框/文案）
import BraintreePayPalOnly from "@/app/checkout/_components/BraintreePayPalOnly";
import PrefetchBraintreeToken from "@/app/checkout/_components/PrefetchBraintreeToken";

// ✅ 预加载 PayPal SDK + Braintree 实例
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
          const isLocked = i > currentIndex;          // 🚫 未来步骤

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
              // 只能点击 ≤ 当前步骤的项（允许回退，不允许前进）
              onClick={() => {
                if (!isLocked) onChange(s.key);
              }}
              // 无障碍：未来步骤不可聚焦
              tabIndex={isLocked ? -1 : 0}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={isLocked ? true : undefined}
              title={isLocked ? "Complete previous steps to continue" : s.label}
              className={[
                "group flex w-1/4 flex-col items-center gap-2 focus:outline-none",
                isLocked ? "cursor-not-allowed pointer-events-auto" : "cursor-pointer",
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

/* ---------------- Address ---------------- */
type Address = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

function AddressForm({
  address,
  setAddress,
  emailInput,
  setEmailInput,
  marketingOptIn,
  setMarketingOptIn,
}: {
  address: Address;
  setAddress: (a: Address) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
}) {
  const on =
    (k: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddress({ ...address, [k]: e.target.value });

  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3 font-semibold">Address</div>

      <div className="p-4 space-y-6">
        {/* === 送货地址表单（放到上面） === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="First Name"
            value={address.firstName || ""}
            onChange={on("firstName")}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Last Name"
            value={address.lastName || ""}
            onChange={on("lastName")}
          />
          <input
            className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Phone"
            value={address.phone || ""}
            onChange={on("phone")}
          />
          <input
            className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Address Line 1"
            value={address.line1 || ""}
            onChange={on("line1")}
          />
          <input
            className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Address Line 2 (optional)"
            value={address.line2 || ""}
            onChange={on("line2")}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="City"
            value={address.city || ""}
            onChange={on("city")}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="State/Region"
            value={address.state || ""}
            onChange={on("state")}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Postcode"
            value={address.postcode || ""}
            onChange={on("postcode")}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Country"
            value={address.country || ""}
            onChange={on("country")}
          />
        </div>

        {/* === Your Details（Email + 勾选）—移动到最下方 === */}
        <div className="border rounded-lg p-4">
          <h3 className="text-base font-medium mb-2">Your Details</h3>
          <p className="text-sm text-neutral-600 mb-3">
            Please enter your email address, we'll send your order confirmation here
          </p>

          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.currentTarget.value);
              setAddress({ ...address, email: e.currentTarget.value });
            }}
          />
          <p className="mt-1 text-xs text-neutral-500">
            You can create an account after checkout
          </p>

          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.currentTarget.checked)}
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

/* ---------------- Page ---------------- */
export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loaded, setLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<Address>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");

  // ✅ 勾选 & 邮箱本地状态（搬到 Address 步去展示）
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [emailInput, setEmailInput] = useState<string>("");

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

  // 预连接 PayPal/Braintree（网络层优化）
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

  // 初始化：读购物车/地址
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
    setLoaded(true);
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

  // 你节省了
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

  const nextStep = () => {
    setStepAndURL(step === "bag" ? "address" : step === "address" ? "delivery" : "payment");
  };

  const itemsCount = cart.reduce((n, it: any) => n + (it?.qty ?? 1), 0);

  // ---------- 获取浏览器时区与偏移（保留备查） ----------
  const clientTZ =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  const clientUTCOffsetMin = -new Date().getTimezoneOffset();

  // ★★★ 关键：无论浏览器在哪，发送到后端的 tz 一律使用中国时区
  const FORCE_CN_TZ = "Asia/Shanghai";

  // ✅ 把订阅发送到 Worker（成功与否都不阻塞结账，也不在控制台报红）
  async function sendSubscriptionIfNeeded(emailRaw?: string) {
    try {
      if (!marketingOptIn) return;
      const email = (emailRaw || address?.email || emailInput || "").trim().toLowerCase();
      if (!email) return;

      const payload = {
        email,
        marketing_opt_in: true,
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

      // 优先使用 sendBeacon
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

  // 支付成功 → 写入预览数据 → 确认页
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

  /* 点击黄色 PayPal 按钮即上报一次（绝不阻塞支付，也不报红） */
  const handlePayInitiated = () => {
    void sendSubscriptionIfNeeded();
  };

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      {/* 进入结算页就预取并缓存 Braintree clientToken */}
      <PrefetchBraintreeToken />
      {/* 进入结算页立刻预加载 PayPal SDK + Braintree（全流程常驻） */}
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
                    <Row label="Total" value={fmtPrice(totalMajor, currency)} strongLeft strongRight bigRight />
                    <div className="mt-1 text-xs text-neutral-500">Including GST</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Address（已内置 Your Details） */}
          {step === "address" && (
            <AddressForm
              address={address}
              setAddress={setAddress}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              marketingOptIn={marketingOptIn}
              setMarketingOptIn={setMarketingOptIn}
            />
          )}

          {/* Delivery（保持原样） */}
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

          {/* Payment：始终挂载；非 payment 时固定在视口内且几乎透明，完成真实渲染 */}
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

              {/* 只有一颗 PayPal 按钮（无外围边框） */}
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
        </div>

        {/* 底部下一步条（非 payment 步骤时显示） */}
        {step !== "payment" && (
          <div className="mt-6 flex justify-end">
            <div className="w-[320px] max-w-full">
              {step === "bag" && (
                <button
                  onClick={() => router.push(`/auth/login?next=${encodeURIComponent("/checkout?step=address")}`)}
                  className="mb-2 w-full rounded-full border bg-white px-6 py-3 text-sm font-semibold hover:bg-neutral-50"
                >
                  Log in / Sign in and Continue
                </button>
              )}
              <button
                onClick={nextStep}
                className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Continue
              </button>
            </div>
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
      <div className={[strongRight ? "font-semibold" : "", bigRight ? "text-lg" : "text-base", valueClass || ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}
