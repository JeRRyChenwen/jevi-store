// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";
import BraintreeDropIn from "@/app/checkout/_components/BraintreeDropIn";
import { selectCurrencyAndTotals } from "@/lib/cartPricing";
import { effectiveMinor, type PriceRec, type Currency } from "@/lib/pricing";

type CartItem = CartListItem;

/* ---------------- 常量 ---------------- */
const LS_CART_KEY = "bag:v1";
const LS_ADDRESS_KEY = "sp.checkout.address";
const DELIVERY_FREE_THRESHOLD = 100; // 元
const DELIVERY_FLAT = 10; // 元

// ✅ 全站统一结算与展示币种
const DISPLAY_CURRENCY: Currency = "AUD";

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
              onClick={() => onChange(s.key)}
              aria-current={isActive ? "step" : undefined}
              className="group flex w-1/4 flex-col items-center gap-2 focus:outline-none"
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
  // email 字段保留在数据里，但 Address 步骤不再收集
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
}: {
  address: Address;
  setAddress: (a: Address) => void;
}) {
  const on =
    (k: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddress({ ...address, [k]: e.target.value });

  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3 font-semibold">Address</div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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
        {/* ❌ 移除了 Email 输入 */}
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

/* ---------------- 下一步按钮 ---------------- */
function StepActionRail({
  step,
  onNext,
  gotoLogin,
}: {
  step: StepKey;
  onNext: () => void;
  gotoLogin: () => void;
}) {
  if (step === "payment") return null; // Payment 步不显示“Continue”
  return (
    <div className="mt-6 flex justify-end">
      <div className="w-[320px] max-w-full">
        {step === "bag" && (
          <button
            onClick={gotoLogin}
            className="mb-2 w-full rounded-full border bg-white px-6 py-3 text-sm font-semibold hover:bg-neutral-50"
          >
            Log in / Sign in and Continue
          </button>
        )}
        <button
          onClick={onNext}
          className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ---------------- 价格工具 ---------------- */
function itemToPriceRecs(it: any): PriceRec[] {
  if (Array.isArray(it?.prices) && it.prices.length) {
    return it.prices
      .map((p: any) => {
        const currency = String(p?.currency || "").toUpperCase() as Currency;
        const amount = Math.max(0, Math.round(Number(p?.price) || 0)); // 分
        const rec: PriceRec = { currency, amount_minor: amount, price: amount };
        if (p?.discount_percent_off != null)
          rec.discount_percent_off = Number(p.discount_percent_off);
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
const baseOf = (r: PriceRec) =>
  Math.max(0, Number((r as any).price ?? r.amount_minor ?? 0));

/* ---------------- Page ---------------- */
export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const myId = useMemo(() => Math.random().toString(36).slice(2), []);

  const [loaded, setLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<Address>({});
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");

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

  // 初始化：读购物车/地址
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    try {
      const rawAddr = localStorage.getItem(LS_ADDRESS_KEY);
      if (rawAddr) setAddress(JSON.parse(rawAddr));
    } catch {}
    setLoaded(true);
  }, []);

  // 同步购物车
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
    } catch {}
    try {
      const count = cart.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      window.dispatchEvent(
        new CustomEvent("bag:count", { detail: { count } })
      );
      window.dispatchEvent(
        new CustomEvent("bag:updated", { detail: { source: myId } })
      );
    } catch {}
  }, [cart, loaded, myId]);

  // 监听其他 tab 对购物车的更新
  useEffect(() => {
    const refresh = (e: Event) => {
      const ce = e as CustomEvent<any>;
      if (ce?.detail?.source === myId) return;
      try {
        const raw = localStorage.getItem(LS_CART_KEY);
        if (raw) setCart(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("bag:updated", refresh as EventListener);
    return () => window.removeEventListener("bag:updated", refresh as EventListener);
  }, [myId]);

  // 地址写回 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(address));
    } catch {}
  }, [address]);

  const hasItems = cart.length > 0;

  // 统一用 AUD 计算与展示
  const pricingInput = useMemo(
    () =>
      cart.map((it: any) => ({
        qty: Number(it?.qty) || 1,
        prices: itemToPriceRecs(it),
      })),
    [cart]
  );

  const itemsTotals = useMemo(() => {
    if (!pricingInput.length)
      return {
        currency: DISPLAY_CURRENCY as Currency,
        itemsMinor: 0,
        itemsMajor: 0,
      };
    // ✅ 强制使用 AUD（DISPLAY_CURRENCY）计算 totals
    const { currency, totalMinor, totalMajor } = selectCurrencyAndTotals(
      pricingInput,
      DISPLAY_CURRENCY,
      undefined,
      DISPLAY_CURRENCY
    );
    return { currency, itemsMinor: totalMinor, itemsMajor: totalMajor };
  }, [pricingInput]);

  // 展示与结算用币种（固定 AUD）
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
        if (baseMajor > priceMajor)
          savedMinor += Math.round((baseMajor - priceMajor) * 100) * qty;
      }
    }
    return savedMinor / 100;
  }, [cart, currency]);

  // 运费
  const deliveryFeeMajor =
    hasItems && itemsTotals.itemsMajor < DELIVERY_FREE_THRESHOLD
      ? DELIVERY_FLAT
      : 0;
  const deliveryFeeMinor = Math.round(deliveryFeeMajor * 100);

  // 总计
  const totalMinor = itemsTotals.itemsMinor + deliveryFeeMinor;
  const totalMajor = itemsTotals.itemsMajor + deliveryFeeMajor;
  const amountInMajorUnit = Math.max(0, Number(totalMajor.toFixed(2)));

  // —— 底部 Pay with PayPal —— //
  const triggerPayRef = useRef<null | (() => void)>(null);
  const [canPay, setCanPay] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleBottomPay = () => {
    if (!triggerPayRef.current || !canPay || paying) return;
    setPaying(true);
    triggerPayRef.current();
    setTimeout(() => setPaying(false), 2000);
  };

  const nextStep = () => {
    setStepAndURL(
      step === "bag"
        ? "address"
        : step === "address"
        ? "delivery"
        : step === "delivery"
        ? "payment"
        : "payment"
    );
  };
  const gotoLogin = () =>
    router.push(`/auth/login?next=${encodeURIComponent("/checkout?step=address")}`);

  const itemsCount = cart.reduce((n, it: any) => n + (it?.qty ?? 1), 0);

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-5 text-sm text-neutral-600">
          <Link href="/" className="hover:underline">
            &larr; Back
          </Link>
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-6">
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
                  <Row
                    label="Subtotal"
                    value={fmtPrice(itemsTotals.itemsMajor, currency)}
                    strongRight
                  />
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
                        itemsTotals.itemsMajor >= DELIVERY_FREE_THRESHOLD
                          ? "text-emerald-700 font-semibold"
                          : undefined
                      }
                    />
                  )}
                  <div className="pt-1">
                    <Row
                      label="Total"
                      value={fmtPrice(totalMajor, currency)}
                      strongLeft
                      strongRight
                      bigRight
                    />
                    <div className="mt-1 text-xs text-neutral-500">
                      Including GST
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === "address" && (
            <AddressForm address={address} setAddress={setAddress} />
          )}

          {step === "delivery" && (
            <>
              {hasItems && itemsTotals.itemsMajor >= DELIVERY_FREE_THRESHOLD && (
                <div className="rounded-xl border px-4 py-3 text-sm">
                  <div className="mb-2 font-medium">
                    Congratulations! You have reached free shipping
                  </div>
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

          {step === "payment" && (
            <section className="rounded-xl border">
              <div className="px-4 py-3 border-b font-semibold">
                How would you like to pay?
              </div>

              <div className="p-4">
                {/* ===== 两列布局：右列自然高度、去掉大边框 ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* LEFT: Payment Options + 蓝色提示 + Delivery Details + 订单摘要 */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="border rounded-lg p-4">
                      <h2 className="text-lg font-medium mb-4">Payment Options</h2>

                      {/* 单一选项：PayPal */}
                      <label className="flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer border-black ring-1 ring-black">
                        <input type="radio" name="payment" className="mt-0.5" checked readOnly />
                        <div className="flex-1 flex items-center justify-between gap-3">
                          <div className="font-medium">PayPal</div>
                          <div className="flex items-center gap-2 opacity-80">
                            <img
                              src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                              alt="PayPal"
                              className="h-5"
                            />
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
                          <div className="font-medium">
                            Make sure your delivery address is correct!
                          </div>
                          <div className="text-gray-600">
                            You can go back to the Address step to make changes.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-base font-medium mb-3">Delivery Details</h3>
                      {address?.firstName || address?.lastName ? (
                        <div className="text-sm leading-6 text-gray-800">
                          <div>
                            {[address.firstName, address.lastName]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
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
                          No delivery address found. Please complete the{" "}
                          <b>Address</b> step.
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
                          {deliveryFeeMinor === 0
                            ? "FREE"
                            : fmtMoneyMinor(deliveryFeeMinor, currency)}
                        </div>
                      </div>
                      <div className="border-t pt-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total</div>
                        <div className="text-xl font-bold">
                          {fmtMoneyMinor(totalMinor, currency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: PayPal + Your Details（无大边框） */}
                  <div className="flex flex-col gap-6">
                    {/* PayPal 区：去掉外层大边框，仅保留按钮本身 */}
                    <div className="w-full max-w-[520px] mx-auto">
                      {amountInMajorUnit <= 0 ? (
                        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 text-center">
                          Your total is $0. Add items to proceed with payment.
                        </div>
                      ) : (
                        <BraintreeDropIn
                          key={`bt-${amountInMajorUnit}-AUD`}
                          amount={amountInMajorUnit}
                          currency="AUD" // ✅ 统一以 AUD 结算
                          enableCard={false}
                          onSucceeded={() => router.push("/checkout/confirm")}
                          hideSubmitButton
                          onExposePay={(fn: () => void) => {
                            triggerPayRef.current = fn;
                          }}
                          onCanPayChange={(can) => setCanPay(can)}
                        />
                      )}
                    </div>

                    {/* Your Details（保留 email 输入与订阅选项） */}
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
                        defaultValue={address?.email || ""}
                        onBlur={(e) =>
                          setAddress({ ...address, email: e.currentTarget.value.trim() })
                        }
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        You can create an account after checkout
                      </p>

                      <label className="mt-3 flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" />
                        <span>Email me updates on New Arrivals, Sale and Offers</span>
                      </label>

                      <p className="mt-3 text-xs text-neutral-500">
                        * We treat your personal data with care, view our <a className="underline" href="/privacy">Privacy Policy</a>.
                      </p>
                    </div>
                  </div>

                  {/* 底部唯一大按钮：跨整行 */}
                  <div className="lg:col-span-3">
                    <button
                      disabled={!canPay || paying}
                      onClick={handleBottomPay}
                      className={[
                        "w-full py-3 rounded-md font-medium",
                        !canPay || paying
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-black text-white hover:bg-neutral-800",
                      ].join(" ")}
                      title={
                        !canPay
                          ? "Click the yellow PayPal button to authorize first"
                          : "Pay with PayPal"
                      }
                    >
                      {paying ? "Processing..." : "Pay with PayPal"}
                    </button>
                  </div>
                </div>

                {/* ✅ 统一币种提示 */}
                <p className="mt-2 text-xs text-gray-500">
                  All charges are processed in <b>AUD</b>. Your bank or PayPal may apply
                  currency conversion and fees.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  * Pay in 4 availability is determined by PayPal and may vary by
                  account and region.
                </p>
              </div>
            </section>
          )}
        </div>

        <StepActionRail step={step} onNext={nextStep} gotoLogin={gotoLogin} />
      </div>
    </main>
  );
}

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
