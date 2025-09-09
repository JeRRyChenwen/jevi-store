// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CartItem = {
  key: string;
  slug: string;
  title: string;
  price: number;       // 成交单价
  basePrice?: number;  // 原价（计算 saved）
  currency: string;
  color?: string;
  size?: string;
  qty: number;
  stock: number;
  image?: string;
};

const LS_KEY = "bag:v1";

// 与右侧抽屉一致的运费规则
const DELIVERY_FREE_THRESHOLD = 100; // 满 100 免运
const DELIVERY_FLAT = 10;

function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function CheckoutPage() {
  const router = useRouter();

  // 购物车
  const [cart, setCart] = useState<CartItem[]>([]);
  const currency = cart[0]?.currency || "USD";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // 计算
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

  const deliveryFee = subtotal >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FLAT;
  const total = subtotal + deliveryFee;

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
      prev
        .map((x) => (x.key === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
        .filter(Boolean) as CartItem[]
    );

  // UI 状态
  const [shipMethod, setShipMethod] = useState<"delivery" | "collect">(
    "delivery"
  );
  const [email, setEmail] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      {/* 放大容器：最大 1800px（可按需改更大） */}
      <div className="mx-auto w-full max-w-[2020px]">
        {/* 顶部返回 & 面包屑 */}
        <div className="mb-5 text-sm text-neutral-600">
          <Link href="/" className="hover:underline">
            &larr; Back
          </Link>
        </div>

        {/* 两列布局：左侧自适应，右侧固定宽度 */}
        <div className="grid gap-6 2xl:gap-10 lg:grid-cols-[minmax(0,1fr)_440px]">
          {/* 左列 */}
          <div className="space-y-6">
            {/* 已达免运提示 */}
            {subtotal >= DELIVERY_FREE_THRESHOLD && (
              <div className="rounded-xl border px-4 py-3 text-sm">
                <div className="mb-2 font-medium">
                  Congratulations! You have reached free shipping
                </div>
                <div className="h-1 w-full overflow-hidden rounded bg-neutral-200">
                  <div className="h-full w-full bg-emerald-600" />
                </div>
              </div>
            )}

            {/* Delivery & Collection */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">
                Delivery & Collection
              </div>

              <div className="p-4 space-y-3">
                <label className="flex items-start gap-3 rounded-lg border p-3 has-[:checked]:border-neutral-900 cursor-pointer">
                  <input
                    type="radio"
                    name="ship"
                    className="mt-1"
                    checked={shipMethod === "delivery"}
                    onChange={() => setShipMethod("delivery")}
                  />
                  <div>
                    <div className="font-medium">Delivery</div>
                    <div className="text-sm text-neutral-600">
                      Select this option to have your order delivered to your
                      doorstep
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border p-3 has-[:checked]:border-neutral-900 cursor-pointer">
                  <input
                    type="radio"
                    name="ship"
                    className="mt-1"
                    checked={shipMethod === "collect"}
                    onChange={() => setShipMethod("collect")}
                  />
                  <div className="flex-1">
                    <div className="font-medium">Click & Collect</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter postcode"
                        className="w-[220px] rounded-md border px-3 py-2 text-sm"
                      />
                      <button className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50">
                        Check
                      </button>
                    </div>
                  </div>
                </label>
              </div>

              {/* Promo / Gift Card 折叠 */}
              <div className="border-t p-4 space-y-3">
                <div>
                  <button
                    className="flex w-full items-center justify-between text-sm"
                    onClick={() => setPromoOpen((v) => !v)}
                  >
                    <span>Enter Promo Code</span>
                    <span className="text-xl leading-none">
                      {promoOpen ? "−" : "+"}
                    </span>
                  </button>
                  {promoOpen && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Promo code"
                        className="flex-1 rounded-md border px-3 py-2 text-sm"
                      />
                      <button className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50">
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <button
                    className="flex w-full items-center justify-between text-sm"
                    onClick={() => setGiftOpen((v) => !v)}
                  >
                    <span>Add Gift Card</span>
                    <span className="text-xl leading-none">
                      {giftOpen ? "−" : "+"}
                    </span>
                  </button>
                  {giftOpen && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Gift card code"
                        className="flex-1 rounded-md border px-3 py-2 text-sm"
                      />
                      <button className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50">
                        Redeem
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Your Bag */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">Your Bag</div>

              <div className="p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-sm text-neutral-500">Bag is empty.</div>
                ) : (
                  cart.map((it) => (
                    <div
                      key={it.key}
                      className="flex gap-3 rounded-lg border p-3 hover:shadow-sm"
                    >
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium">
                          {it.title}
                        </div>
                        <div className="mt-1 text-xs text-neutral-600">
                          {it.color && <span>Color: {it.color}</span>}
                          {it.size && <span className="ml-3">Size: {it.size}</span>}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <div className="text-sm font-semibold">
                              {fmtPrice(it.price, it.currency)}
                            </div>
                            {typeof it.basePrice === "number" &&
                              it.basePrice > it.price && (
                                <div className="text-xs text-neutral-400 line-through">
                                  {fmtPrice(it.basePrice, it.currency)}
                                </div>
                              )}
                          </div>

                          <div className="flex items-center gap-1 rounded-full border">
                            <button
                              className="px-2 py-1 hover:bg-neutral-50"
                              onClick={() => dec(it.key)}
                              title="Decrease"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm">
                              {it.qty}
                            </span>
                            <button
                              className="px-2 py-1 hover:bg-neutral-50"
                              onClick={() => inc(it.key)}
                              title="Increase"
                              disabled={it.qty >= it.stock}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-1 text-[11px] text-neutral-500">
                          Max {it.stock} available
                        </div>
                      </div>

                      <button
                        className="self-start rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                        onClick={() => removeItem(it.key)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Order Summary */}
              <div className="border-t p-4">
                <div className="mb-2 text-sm font-semibold">Order Summary</div>

                <div className="space-y-2 text-sm">
                  <Row
                    label="Subtotal"
                    value={fmtPrice(subtotal, currency)}
                    strongRight
                  />
                  {saved > 0 && (
                    <Row
                      label="You saved"
                      value={`- ${fmtPrice(saved, currency)}`}
                      valueClass="text-rose-600"
                    />
                  )}
                  <Row
                    label="Estimated Shipping"
                    value={
                      subtotal >= DELIVERY_FREE_THRESHOLD
                        ? "FREE for over $100"
                        : fmtPrice(deliveryFee, currency)
                    }
                    valueClass={
                      subtotal >= DELIVERY_FREE_THRESHOLD
                        ? "text-emerald-700 font-semibold"
                        : undefined
                    }
                  />
                  <div className="pt-1">
                    <Row
                      label="Total"
                      value={fmtPrice(total, currency)}
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
          </div>

          {/* 右列 */}
          <div className="space-y-6">
            {/* Express Checkout */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">
                EXPRESS CHECKOUT
              </div>
              <div className="p-4">
                <button className="mb-3 w-full rounded-md bg-[#ffc439] px-4 py-3 text-center text-sm font-semibold text-black hover:brightness-95">
                  PayPal
                </button>
                <button className="w-full rounded-md bg-[#ffd266] px-4 py-3 text-center text-sm font-semibold text-black hover:brightness-95">
                  Pay in 4
                </button>

                <div className="mt-4 text-center text-xs text-neutral-500">
                  ADDITIONAL PAYMENT METHODS BELOW
                </div>
              </div>
            </section>

            {/* Your Details */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">Your Details</div>
              <div className="p-4 space-y-4">
                <div className="text-sm text-neutral-600">
                  Please enter your email address, we'll send your order
                  confirmation here
                </div>
                <label className="block text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>Email me updates on New Arrivals, Sale and Offers</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>SMS me updates on New Arrivals, Sale and Offers</span>
                </label>

                <div className="text-xs text-neutral-500">
                  * We treat your personal data with care, view our{" "}
                  <a className="underline" href="#">
                    Privacy Policy
                  </a>
                  .
                </div>

                <button
                  onClick={() => router.push("/checkout/confirm")}
                  className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Continue
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

/** 左对齐标签 / 右对齐金额的小行组件 */
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
