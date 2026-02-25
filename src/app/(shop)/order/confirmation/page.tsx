// src/app/(shop)/order/confirmation/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { countryLabelOf } from "@/lib/country";

type ServerOrder = {
  id: number;
  order_number?: string | null;
  currency?: string | null;

  // 你后端可能返回这些不同字段名（都做兼容）
  items_total_minor?: number | null;
  delivery_fee_minor?: number | null;
  grand_total_minor?: number | null;

  // 你截图里看到的是 total_minor
  total_minor?: number | null;

  // 地址（两种结构）
  shipping_address_json?: any;

  // 扁平字段（你 Worker /orders 很常见是这种）
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  addr_line1?: string | null;
  addr_line2?: string | null;
  addr_city?: string | null;
  addr_state?: string | null;
  addr_postcode?: string | null;
  addr_country?: string | null;

  // 你订单里可能有 delivery_option
  delivery_option?: string | null;

  // 有些实现会把 items 放到 order.items
  items?: any[] | null;
};

type ServerItem = {
  id?: number;

  product_title?: string | null;
  variant_title?: string | null;

  qty?: number;

  unit_price_minor?: number;
  line_total_minor?: number;

  product_sku?: string | null;

  snapshot?: any;

  image_url?: string | null;
};

type ServerResp = {
  ok: boolean;
  order?: ServerOrder;
  items?: ServerItem[];

  // 其他字段无所谓
  [k: string]: any;
};

function fmtMoneyMinor(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format((Number(minor || 0) || 0) / 100);
}

function clampMinor(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? (n | 0) : 0;
}

function isFiniteInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && Math.floor(n) === n;
}

function getQty(it: any): number {
  const q = Number(it?.qty ?? 1);
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

function pickName(it: any) {
  return String(it?.snapshot?.title ?? it?.product_title ?? "Item");
}

function pickVariant(it: any) {
  const v = it?.snapshot?.variant_title ?? it?.variant_title ?? null;
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function pickImage(it: any) {
  const s =
    it?.image_url ??
    it?.snapshot?.image_url ??
    it?.snapshot?.attrs?.image_url ??
    it?.snapshot?.image ??
    null;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

function FinalizingView({ orderId }: { orderId: number }) {
  return (
    <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border bg-neutral-50 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold">Finalizing your order…</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Please wait a moment while we sync your order details.
          </p>
          <div className="mt-4 inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
            Order ID:
            <span className="ml-1 font-mono text-neutral-900">{orderId}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function normalizeItems(resp: ServerResp | null): ServerItem[] | null {
  if (!resp || !resp.ok) return null;

  // 优先用 top-level items
  if (Array.isArray(resp.items) && resp.items.length > 0) return resp.items;

  // 兼容 order.items
  const oi = (resp.order as any)?.items;
  if (Array.isArray(oi) && oi.length > 0) return oi as any;

  return null;
}

function normalizeAddress(order: ServerOrder | null): any | null {
  if (!order) return null;

  // 1) 优先 shipping_address_json
  const sj = order.shipping_address_json;
  if (sj && typeof sj === "object") {
    const hasAny =
      sj.firstName || sj.lastName || sj.line1 || sj.city || sj.state || sj.postcode || sj.country;
    if (hasAny) return sj;
  }

  // 2) 扁平字段拼出来
  const flat = {
    firstName: (order as any).first_name ?? null,
    lastName: (order as any).last_name ?? null,
    phone: (order as any).phone ?? null,
    email: (order as any).email ?? null,

    line1: (order as any).addr_line1 ?? null,
    line2: (order as any).addr_line2 ?? null,
    city: (order as any).addr_city ?? null,
    state: (order as any).addr_state ?? null,
    postcode: (order as any).addr_postcode ?? null,
    country: (order as any).addr_country ?? null,
  };

  const hasAny =
    flat.firstName ||
    flat.lastName ||
    flat.line1 ||
    flat.city ||
    flat.state ||
    flat.postcode ||
    flat.country;

  return hasAny ? flat : null;
}

function deriveMoney(order: ServerOrder, items: ServerItem[]) {
  const currency = String(order.currency || "AUD").toUpperCase();

  // items_total_minor：优先用 order.items_total_minor；否则从 items 计算
  const itemsTotal =
    isFiniteInt(order.items_total_minor)
      ? clampMinor(order.items_total_minor)
      : items.reduce((sum, it) => sum + clampMinor(it.line_total_minor), 0);

  // total/grand_total：优先 grand_total_minor，其次 total_minor
  const totalMinor =
    isFiniteInt(order.grand_total_minor)
      ? clampMinor(order.grand_total_minor)
      : isFiniteInt(order.total_minor)
      ? clampMinor(order.total_minor)
      : itemsTotal; // 最差兜底

  // delivery_fee_minor：优先 order.delivery_fee_minor；否则用 total - items_total 反推（>=0）
  const shippingMinor =
    isFiniteInt(order.delivery_fee_minor)
      ? clampMinor(order.delivery_fee_minor)
      : Math.max(0, totalMinor - itemsTotal);

  return { currency, itemsTotal, totalMinor, shippingMinor };
}

export default function OrderConfirmationPage() {
  const sp = useSearchParams();

  const orderId = useMemo(() => {
    const raw = sp.get("orderId");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }, [sp]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<ServerOrder | null>(null);
  const [items, setItems] = useState<ServerItem[] | null>(null);

  // ✅ 进入 confirmation 立刻清空购物袋
  useEffect(() => {
    try {
      localStorage.setItem("bag:v1", "[]");
      window.dispatchEvent(new CustomEvent("bag:count", { detail: { count: 0 } }));
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {}
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let timer: any = null;

    const poll = async () => {
      if (cancelled) return;
      setLoading(true);

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "GET",
          credentials: "include",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });

        const data: ServerResp | null = await res.json().catch(() => null);
        if (cancelled) return;

        const gotOrder = !!(res.ok && data?.ok && data.order);
        const gotItems = !!normalizeItems(data);

        if (gotOrder && gotItems) {
          setOrder(data!.order!);
          setItems(normalizeItems(data)!);
          setLoading(false);
          return; // stop polling
        }
      } catch {
        // ignore and keep polling
      }

      if (!cancelled) {
        setLoading(true);
        timer = setTimeout(poll, 500);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Missing order id</h1>
          <p className="text-neutral-600 mb-6">We couldn’t find an orderId in the URL.</p>
          <Link href="/" className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (loading || !order || !items) {
    return <FinalizingView orderId={orderId} />;
  }

  const { currency, totalMinor, shippingMinor } = deriveMoney(order, items);

  const address = normalizeAddress(order);
  const deliveryOption =
    (order.delivery_option ? String(order.delivery_option) : "").trim() || "standard";

  const emailLine = String((order as any)?.email || "").trim();

  return (
    <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full border bg-neutral-50 p-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Thanks for your order!
              </h1>

              {emailLine ? (
                <p className="mt-1 text-sm text-neutral-600">
                  We’ve emailed your receipt and order details to{" "}
                  <span className="font-medium text-neutral-800">{emailLine}</span>.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {order.order_number ? (
                  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
                    Order No:
                    <span className="ml-1 font-mono text-neutral-900">{order.order_number}</span>
                  </span>
                ) : null}

                <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
                  Order ID:
                  <span className="ml-1 font-mono text-neutral-900">{order.id}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Items</h2>
              <div className="text-sm text-neutral-600">
                {items.reduce((n, it) => n + getQty(it), 0)} item
                {items.reduce((n, it) => n + getQty(it), 0) > 1 ? "s" : ""}
              </div>
            </div>

            <div className="mt-4 divide-y">
              {items.map((it, idx) => {
                const name = pickName(it);
                const variant = pickVariant(it);
                const qty = getQty(it);
                const unit = clampMinor(it.unit_price_minor);
                const line = clampMinor(it.line_total_minor);
                const img = pickImage(it);

                const sku =
                  String(it.product_sku || it.snapshot?.product_sku || "").trim() || null;

                return (
                  <div key={String(it.id ?? idx)} className="py-4 flex gap-4">
                    <div className="h-20 w-20 rounded-xl border bg-neutral-50 overflow-hidden flex items-center justify-center shadow-sm">
                      {img ? (
                        <img
                          src={img}
                          alt={name}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-xs text-neutral-400">No image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{name}</div>
                          {variant ? (
                            <div className="text-sm text-neutral-600 mt-0.5">{variant}</div>
                          ) : null}
                          {sku ? (
                            <div className="text-[11px] text-neutral-400 mt-1 break-all">
                              SKU: {sku}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm text-neutral-600">
                            {qty} × {fmtMoneyMinor(unit, currency)}
                          </div>
                          <div className="text-base font-semibold">
                            {fmtMoneyMinor(line, currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Order Summary</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Delivery fee</span>
                  <span className="font-medium text-neutral-900">
                    {shippingMinor === 0 ? "FREE" : fmtMoneyMinor(shippingMinor, currency)}
                  </span>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">{fmtMoneyMinor(totalMinor, currency)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Delivery Details</h2>

              {address ? (
                <div className="mt-3 text-sm leading-6 text-neutral-800">
                  <div className="font-medium text-neutral-900">
                    {[address.firstName, address.lastName].filter(Boolean).join(" ")}
                  </div>

                  {address.line1 ? (
                    <div>
                      {address.line1}
                      {address.line2 ? ` ${address.line2}` : ""}
                    </div>
                  ) : null}

                  {(address.city || address.state || address.postcode) ? (
                    <div>
                      {[address.city, address.state, address.postcode].filter(Boolean).join(" ")}
                    </div>
                  ) : null}

                  {address.country ? (
                    <div>{countryLabelOf(String(address.country)) || String(address.country)}</div>
                  ) : null}

                  {address.phone ? <div className="mt-2">{address.phone}</div> : null}
                  {address.email ? <div>{address.email}</div> : null}
                </div>
              ) : (
                <div className="mt-3 text-sm text-neutral-500">No address provided.</div>
              )}

              <div className="mt-4 rounded-xl border bg-neutral-50 px-4 py-3 text-sm flex items-center justify-between">
                <span className="text-neutral-600">Delivery method</span>
                <span className="font-medium text-neutral-900">
                  {deliveryOption.toLowerCase() === "express" ? "Express" : "Standard"}
                </span>
              </div>
            </section>

            <div className="flex justify-end">
              <Link
                href="/"
                className="rounded-md bg-black text-white px-6 py-2 text-sm font-medium text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}