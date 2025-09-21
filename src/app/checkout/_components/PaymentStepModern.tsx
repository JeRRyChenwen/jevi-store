// src/app/checkout/_components/PaymentStepModern.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import BraintreeDropIn from "./BraintreeDropIn"; // ✅ 复用你现有的 Drop-in 组件
import { cn } from "@/lib/utils"; // 若没有该工具，可把 cn 替换成简单模板字符串

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
  // 允许多种价字段命名，尽量兼容你项目现状
  price?: number;              // 以“元”为单位
  salePrice?: number;          // 以“元”为单位
  priceMinor?: number;         // 以“分”为单位
  salePriceMinor?: number;     // 以“分”为单位
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
  // 尝试读取 Address 步保存的草稿。你可以把 key 改成你真实使用的 key
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
  const [selected, setSelected] = useState<"paypal">("paypal");

  useEffect(() => {
    setAddress(loadAddress());
    setCart(loadCart());
  }, []);

  const currency = useMemo(() => {
    return cart.find(i => i?.currency)?.currency || "AUD";
  }, [cart]);

  const subtotalMinor = useMemo(() => {
    return cart.reduce((sum, it) => {
      const qty = it.qty ?? 1;
      // 优先使用 “分”，否则使用 “元 * 100”
      let unitMinor =
        typeof it.salePriceMinor === "number" ? it.salePriceMinor :
        typeof it.priceMinor === "number" ? it.priceMinor :
        typeof it.salePrice === "number" ? Math.round(it.salePrice * 100) :
        typeof it.price === "number" ? Math.round(it.price * 100) :
        0;
      return sum + unitMinor * qty;
    }, 0);
  }, [cart]);

  const deliveryMinor = 0; // 这里先做免费运费，后续你可按需替换
  const totalMinor = subtotalMinor + deliveryMinor;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold mb-6">How would you like to pay?</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Payment Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Options Card */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-medium mb-4">Payment Options</h2>

            {/* —— 单一选项：PayPal —— */}
            <label
              className={cn(
                "flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer",
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
                  {/* 右侧贴品牌徽标，可用你自己的图片资源 */}
                  <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-5" />
                </div>
              </div>
            </label>

            {/* 选中 PayPal 后，渲染 Drop-in/按钮 */}
            {selected === "paypal" && (
              <div className="mt-4 border rounded-md p-3">
                {/* ✅ 这里直接放你原本的 Braintree PayPal 组件
                    注意：BraintreeDropIn 通常需要 amount(“元”) 与 currency
                    我们把 totalMinor -> 元 传入 */}
                <BraintreeDropIn
                  amount={Number((totalMinor / 100).toFixed(2))}
                  currency={currency}
                />
                {/* 保留你组件内部的黄色 PayPal 按钮即可；不要再重复渲染“Pay Now” */}
              </div>
            )}
          </div>

          {/* “Pay Now”大按钮（示例样式，禁用态保持与模板一致；真正支付点击在 PayPal 黄色按钮里完成） */}
          <button
            disabled
            className="w-full py-3 rounded-md bg-gray-200 text-gray-500 font-medium cursor-not-allowed"
            title="Click the PayPal button above to complete payment"
          >
            Pay Now
          </button>

          {/* 说明 */}
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

          {/* Order Summary（右侧小计/总计） */}
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
