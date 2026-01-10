// src/app/checkout/_components/PaymentStepModern.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import BraintreeDropIn from "./BraintreeDropIn"; // 你现有的 PayPal 组件（含黄色按钮）
import BraintreeHostedFields from "./BraintreeHostedFields"; // 新增：卡支付组件
import { cn } from "@/lib/utils"; // 若你没有该工具，可以直接用模板字符串替代

type Address = {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
};

type CartItem = {
  key?: string;
  title?: string;
  variant?: string;
  color?: string;
  size?: string;
  qty?: number;
  // 兼容多种价格字段命名
  price?: number;              // 单位“元”
  salePrice?: number;          // 单位“元”
  priceMinor?: number;         // 单位“分”
  salePriceMinor?: number;     // 单位“分”
  currency?: string;
  imageUrl?: string;
};

function formatMoney(minor: number, currency: string) {
  const major = (minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "AUD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency || "AUD"} ${major.toFixed(2)}`;
  }
}

function loadAddress(): Address | null {
  const KEYS = ["sp.checkout.address", "checkout_address", "addressDraft"];
  for (const k of KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

function loadCart(): CartItem[] {
  const KEYS = ["sp.cart", "sp.bag", "cart", "bag"];
  for (const k of KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
}

export default function PaymentStepModern() {
  const [address, setAddress] = useState<Address | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<"paypal" | "card">("paypal");

  useEffect(() => {
    setAddress(loadAddress());
    setCart(loadCart());
  }, []);

  const currency = useMemo(() => {
    return cart.find((i) => i?.currency)?.currency || "AUD";
  }, [cart]);

  const subtotalMinor = useMemo(() => {
    return cart.reduce((sum, it) => {
      const qty = it.qty ?? 1;
      const unitMinor =
        typeof it.salePriceMinor === "number" ? it.salePriceMinor :
        typeof it.priceMinor === "number" ? it.priceMinor :
        typeof it.salePrice === "number" ? Math.round(it.salePrice * 100) :
        typeof it.price === "number" ? Math.round(it.price * 100) :
        0;
      return sum + unitMinor * qty;
    }, 0);
  }, [cart]);

  const deliveryMinor = 0; // 示例：免运费
  const totalMinor = subtotalMinor + deliveryMinor;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold mb-6">How would you like to pay?</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Payment Options */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-medium mb-4">Payment Options</h2>

            {/* 选项：PayPal */}
            <label
              className={cn(
                "flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer mb-3",
                selected === "paypal" ? "border-black ring-1 ring-black" : "border-gray-300"
              )}
            >
              <input
                type="radio"
                name="payment"
                className="mt-0.5"
                checked={selected === "paypal"}
                onChange={() => setSelected("paypal")}
              />
              <div className="flex-1 flex items-center justify-between gap-3">
                <div className="font-medium">PayPal – Pay Now or Pay in 4*</div>
                <div className="flex items-center gap-2 opacity-80">
                  <img
                    src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                    alt="PayPal"
                    className="h-5"
                  />
                </div>
              </div>
            </label>

            {/* 选项：Card（Braintree Hosted Fields） */}
            <label
              className={cn(
                "flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer",
                selected === "card" ? "border-black ring-1 ring-black" : "border-gray-300"
              )}
            >
              <input
                type="radio"
                name="payment"
                className="mt-0.5"
                checked={selected === "card"}
                onChange={() => setSelected("card")}
              />
              <div className="flex-1 flex items-center justify-between gap-3">
                <div className="font-medium">Debit or Credit Card</div>
                <div className="flex items-center gap-2 opacity-80">
                  {/* 品牌小图标可换成你自己的资源 */}
                  <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-4" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/0/0c/Mastercard_logo.png" alt="Mastercard" className="h-4" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Amex_logo.svg" alt="AmEx" className="h-4" />
                </div>
              </div>
            </label>

            {/* 渲染具体支付组件 */}
            <div className="mt-4 border rounded-md p-3">
              {selected === "paypal" ? (
                // 你现有的 PayPal 组件（内部有黄色按钮完成支付）
                <BraintreeDropIn
                  amount={Number((totalMinor / 100).toFixed(2))}
                  currency={currency}
                />
              ) : (
                // 我们新增的卡支付组件（自带“Pay …”按钮）
                <BraintreeHostedFields
                  amount={Number((totalMinor / 100).toFixed(2))}
                  currency={currency}
                />
              )}
            </div>
          </div>

          {/* PayNow 按钮：当选择 PayPal 时，这个按钮没有用（禁用 + 提示）；
              当选择 Card 时，实际的支付按钮在 HostedFields 里面，所以这里也不需要额外按钮。 */}
          <button
            disabled
            className="w-full py-3 rounded-md bg-gray-200 text-gray-500 font-medium cursor-not-allowed"
            title={
              selected === "paypal"
                ? "Click the PayPal button above to complete payment"
                : "Use the Pay button inside the card form"
            }
          >
            {selected === "paypal" ? "Pay Now (use PayPal button above)" : "Pay Now"}
          </button>

          <p className="text-xs text-gray-500">
            * Pay in 4 availability is determined by PayPal and may vary by account and region.
          </p>
        </div>

        {/* RIGHT: Delivery Details + Summary */}
        <aside className="space-y-6">
          {/* 提示条 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check size={14} />
              </span>
              <div>
                <div className="font-medium">Make sure your delivery address is correct!</div>
                <div className="text-gray-600">
                  You can go back to the Address step to make changes.
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="border rounded-lg p-4">
            <h3 className="text-base font-medium mb-3">Delivery Details</h3>
            {address ? (
              <div className="text-sm leading-6 text-gray-800">
                {address.fullName && <div>{address.fullName}</div>}
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

          {/* Order Summary */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Items</div>
              <div className="text-base font-medium">
                {cart.reduce((n, it) => n + (it.qty ?? 1), 0)} item
                {cart.reduce((n, it) => n + (it.qty ?? 1), 0) > 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Subtotal</div>
              <div className="text-base font-medium">
                {formatMoney(subtotalMinor, currency)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Delivery</div>
              <div className="text-base font-medium">
                {deliveryMinor === 0 ? "FREE" : formatMoney(deliveryMinor, currency)}
              </div>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <div className="text-lg font-semibold">Total</div>
              <div className="text-xl font-bold">
                {formatMoney(totalMinor, currency)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
