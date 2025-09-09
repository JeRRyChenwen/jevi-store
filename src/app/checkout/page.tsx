// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";

type CartItem = CartListItem;

const LS_KEY = "bag:v1";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
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
      {/* 背景线 */}
      <div className="absolute left-0 right-0 top-6 h-[2px] bg-neutral-200" />
      {/* 进度线 */}
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

/* ---------------- 示例地址表单 ---------------- */
function AddressForm() {
  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3 font-semibold">Address</div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="First Name" />
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Last Name" />
        <input className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm" placeholder="Phone" />
        <input className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm" placeholder="Address Line 1" />
        <input className="md:col-span-2 w-full rounded-md border px-3 py-2 text-sm" placeholder="Address Line 2 (optional)" />
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="City" />
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="State/Region" />
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Postcode" />
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Country" />
      </div>
    </section>
  );
}

/* ---------------- 新 Delivery：仅选择配送方式 ---------------- */
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

/* ---------------- 右侧按钮栏 ---------------- */
function StepActionRail({
  step,
  onNext,
  onCheckout,
  gotoLogin,
}: {
  step: StepKey;
  onNext: () => void;
  onCheckout: () => void;
  gotoLogin: () => void;
}) {
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

        {step === "payment" ? (
          <button
            onClick={onCheckout}
            className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Check out
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 自触发保护 & 首次加载标记
  const myId = useMemo(() => Math.random().toString(36).slice(2), []);
  const [loaded, setLoaded] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const currency = cart[0]?.currency || "USD";

  // 初始 step
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

  // 第一次只读不写
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // 只有 loaded 才允许写回 & 广播（带 source）
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cart));
    } catch {}
    try {
      const count = cart.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      window.dispatchEvent(new CustomEvent("bag:count", { detail: { count } }));
      window.dispatchEvent(
        new CustomEvent("bag:updated", { detail: { source: myId } })
      );
    } catch {}
  }, [cart, loaded, myId]);

  // 监听其它来源的变更
  useEffect(() => {
    const refresh = (e: Event) => {
      const ce = e as CustomEvent<any>;
      if (ce?.detail?.source === myId) return; // 忽略来自自己的广播
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setCart(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("bag:updated", refresh as EventListener);
    return () =>
      window.removeEventListener("bag:updated", refresh as EventListener);
  }, [myId]);

  // 计算
  const hasItems = cart.length > 0;
  const subtotal = useMemo(
    () => cart.reduce((acc, it) => acc + it.price * it.qty, 0),
    [cart]
  );
  const saved = useMemo(
    () =>
      cart.reduce((acc, it) => {
        const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
        const diff = base - it.price;
        return acc + (diff > 0 ? diff * it.qty : 0);
      }, 0),
    [cart]
  );
  const deliveryFee =
    hasItems && subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const total = hasItems ? subtotal + deliveryFee : 0;

  // 交互
  const removeItem = (key: string) =>
    setCart((prev) => prev.filter((x) => x.key !== key));
  const inc = (key: string) =>
    setCart((prev) =>
      prev.map((x) =>
        x.key === key ? { ...x, qty: Math.min(x.qty + 1, x.stock) } : x
      )
    );
  const dec = (key: string) =>
    setCart((prev) =>
      prev.map((x) =>
        x.key === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x
      )
    );

  // ✅ 仅选择配送方式（默认 standard）
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");

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
  const doCheckout = () => router.push("/checkout/confirm");
  const gotoLogin = () =>
    router.push(
      `/auth/login?next=${encodeURIComponent("/checkout?step=address")}`
    );

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
                <CartList cart={cart} onInc={inc} onDec={dec} onRemove={removeItem} />
              </div>

              <div className="border-t p-4">
                <div className="mb-2 text-sm font-semibold">Order Summary</div>
                <div className="space-y-2 text-sm">
                  <Row label="Subtotal" value={fmtPrice(subtotal, currency)} strongRight />
                  {saved > 0 && (
                    <Row
                      label="You saved"
                      value={fmtPrice(saved, currency)}            // 无负号
                      valueClass="text-emerald-700 font-semibold"  // 绿色
                    />
                  )}
                  {hasItems && (
                    <Row
                      label="Delivery fee"
                      value={
                        subtotal >= DELIVERY_FREE_THRESHOLD
                          ? "FREE for over $100"
                          : fmtPrice(DELIVERY_FLAT, currency)
                      }
                      valueClass={
                        subtotal >= DELIVERY_FREE_THRESHOLD
                          ? "text-emerald-700 font-semibold"
                          : undefined
                      }
                    />
                  )}
                  <div className="pt-1">
                    <Row label="Total" value={fmtPrice(total, currency)} strongLeft strongRight bigRight />
                    <div className="mt-1 text-xs text-neutral-500">Including GST</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === "address" && <AddressForm />}

          {step === "delivery" && (
            <>
              {hasItems && subtotal >= DELIVERY_FREE_THRESHOLD && (
                <div className="rounded-xl border px-4 py-3 text-sm">
                  <div className="mb-2 font-medium">
                    Congratulations! You have reached free shipping
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded bg-neutral-200">
                    <div className="h-full w-full bg-emerald-600" />
                  </div>
                </div>
              )}

              {/* ✅ 新版：仅选择配送方式（标准/加急） */}
              <DeliverySection
                deliveryMethod={deliveryMethod}
                setDeliveryMethod={setDeliveryMethod}
              />
            </>
          )}

          {step === "payment" && (
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">Payment</div>
              <div className="p-4">/* your payment form here */</div>
            </section>
          )}
        </div>

        <StepActionRail step={step} onNext={nextStep} onCheckout={doCheckout} gotoLogin={gotoLogin} />
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
      <div className={[strongRight ? "font-semibold" : "", bigRight ? "text-lg" : "text-base", valueClass || ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}
