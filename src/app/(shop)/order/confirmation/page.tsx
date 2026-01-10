// src/app/order/confirmation/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Preview = {
  ts: number;
  currency: string;
  totalMinor: number;
  items: any[];
  address: any;
  deliveryMethod: "standard" | "express";
  payload?: any;
};

function fmtMoneyMinor(minor: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format((minor ?? 0) / 100);
}

export default function OrderConfirmationPage() {
  const [data, setData] = useState<Preview | null>(null);

  // 读取上一步保存的订单预览
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("last-order-preview");
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  // 清空购物袋（当且仅当拿到 data 时执行）
  useEffect(() => {
    if (!data) return;
    try {
      localStorage.setItem("bag:v1", "[]");
      window.dispatchEvent(new CustomEvent("bag:count", { detail: { count: 0 } }));
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {}
  }, [data]);

  // ✅ 顶层声明，内部用可选链保护，避免 Hook 顺序变化
  const itemCount = useMemo(() => {
    const list = data?.items;
    if (!Array.isArray(list)) return 0;
    return list.reduce((n, it: any) => n + (it?.qty ?? 1), 0);
  }, [data]);

  // 早退视图
  if (!data) {
    return (
      <main className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">No order to show</h1>
          <p className="text-neutral-600 mb-6">
            We couldn’t find your latest order details. If you just paid, try refreshing this page.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium">
              Back to Home
            </Link>
            <Link href="/checkout" className="rounded-md border px-4 py-2 text-sm font-medium">
              Back to Checkout
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { currency, totalMinor, address, deliveryMethod, payload } = data;

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Thanks for your order!</h1>
        <p className="text-neutral-600 mt-1">
          We’ve emailed your receipt and order details{address?.email ? ` to ${address.email}` : ""}.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h2 className="font-medium mb-3">Order Summary</h2>
            <div className="flex items-center justify-between text-sm">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <div className="mt-2 border-t pt-2 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">{fmtMoneyMinor(totalMinor, currency)}</span>
            </div>
            {payload?.orderId && (
              <div className="mt-2 text-sm text-neutral-600">
                PayPal Order ID: <span className="font-mono">{payload.orderId}</span>
              </div>
            )}
            {payload?.transactionId && (
              <div className="text-sm text-neutral-600">
                Transaction ID: <span className="font-mono">{payload.transactionId}</span>
              </div>
            )}
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-medium mb-3">Delivery Details</h2>
            {address ? (
              <div className="text-sm leading-6">
                <div>{[address.firstName, address.lastName].filter(Boolean).join(" ")}</div>
                <div>
                  {address.line1}
                  {address.line2 ? ` ${address.line2}` : ""}
                </div>
                <div>
                  {address.city} {address.state} {address.postcode}
                </div>
                <div>{address.country}</div>
                {address.phone && <div>{address.phone}</div>}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No address provided.</div>
            )}
            <div className="mt-3 text-sm">
              Delivery method: <b>{deliveryMethod === "express" ? "Express" : "Standard"}</b>
            </div>
          </section>
        </div>

        {/* ⬇️ 这里只保留一个按钮，并把容器右对齐 */}
        <div className="mt-8 flex justify-end">
          <Link
            href="/"
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
