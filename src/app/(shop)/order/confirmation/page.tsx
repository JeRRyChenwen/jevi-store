// src/app/(shop)/order/confirmation/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { countryLabelOf } from "@/lib/country";
import { CheckCircle2 } from "lucide-react";

// ✅ 关键：复用 Checkout 的“同一套价格解析”
import { itemToPriceRecs } from "@/app/(shop)/checkout/(hooks)/usePricing";

type Preview = {
  ts: number;
  currency: string;

  // ⚠️ 旧字段：不再当真相，只做兜底
  totalMinor: number;

  items: any[];
  address: any;
  deliveryMethod: "standard" | "express";

  payload?: any;
  orderId?: number | null;
  orderNumber?: string | null;

  // 你现在的 preview 里其实还有 quote（用于 delivery fee）
  quote?: any;
};

type ServerOrder = {
  id: number;
  order_number: string | null;
  currency: string | null;

  items_total_minor?: number | null;
  delivery_fee_minor?: number | null;
  tax_minor?: number | null;
  discount_minor?: number | null;
  grand_total_minor?: number | null;

  delivery_option?: string | null;
};

type ServerItem = {
  id?: number;
  product_title?: string | null;
  variant_title?: string | null;

  qty?: number;
  item_qty?: number;

  currency?: string | null;

  unit_price_minor?: number;
  item_unit_price_minor?: number;

  line_total_minor?: number;
  item_line_total_minor?: number;

  product_sku?: string | null;
  variant_options_json?: string | null;

  snapshot?: any;
};

type ServerResp = {
  ok: boolean;
  order?: ServerOrder;
  items?: ServerItem[];
};

function fmtMoneyMinor(minor: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format((Number(minor || 0) || 0) / 100);
}

function isFiniteInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && Math.floor(n) === n;
}

function clampMinor(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? (n | 0) : 0;
}

function isPositiveInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && Math.floor(n) === n;
}

function pickOrderIdFromPreview(p: Preview | null): number | null {
  if (!p) return null;

  const cands = [
    p?.payload?.order?.id,
    p?.orderId,
    (p as any)?.order?.id,
    (p as any)?.payload?.serverOrderId,
    (p as any)?.payload?.dbOrderId,
  ];

  for (const x of cands) {
    if (isPositiveInt(x)) return Number(x);
  }
  return null;
}

function getQty(it: any): number {
  const q = Number(it?.qty ?? it?.item_qty ?? 1);
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

function pickImageFromItem(it: any): string | null {
  const a =
    it?.snapshot?.image ??
    it?.snapshot?.attrs?.image ??
    it?.image ??
    it?.img ??
    it?.attrs?.image ??
    null;
  if (typeof a === "string" && a.trim()) return a.trim();
  return null;
}

function pickNameFromItem(it: any): string {
  const s =
    it?.product_title ??
    it?.title ??
    it?.name ??
    it?.snapshot?.title ??
    it?.snapshot?.attrs?.title ??
    "Item";
  return String(s);
}

function pickVariantFromItem(it: any): string | null {
  const v =
    it?.variant_title ??
    it?.variant ??
    it?.snapshot?.variant_title ??
    it?.snapshot?.attrs?.variant_title ??
    null;

  const str = typeof v === "string" ? v.trim() : "";
  return str ? str : null;
}

function pickSkuFromItem(it: any): string | null {
  const s = it?.product_sku ?? it?.sku ?? it?.variantSku ?? null;
  const str = typeof s === "string" ? s.trim() : "";
  return str ? str : null;
}

function prettyDeliveryOption(v: any): "Standard" | "Express" {
  const s = String(v ?? "").toLowerCase();
  return s.includes("express") ? "Express" : "Standard";
}

function pickPaymentInfo(payload: any) {
  const payment = payload?.payment ?? payload ?? null;

  const paypalOrderId =
    payment?.orderId ??
    payment?.paypalOrderId ??
    payment?.raw?.id ??
    payload?.orderId ??
    null;

  const transactionId =
    payment?.transactionId ??
    payment?.provider_txn_id ??
    payment?.paypalCaptureId ??
    payment?.raw?.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
    null;

  const provider =
    payment?.provider ??
    (payment?.transactionId || payment?.cardLast4 ? "braintree" : "paypal");

  return {
    provider: String(provider || ""),
    paypalOrderId: paypalOrderId ? String(paypalOrderId) : null,
    transactionId: transactionId ? String(transactionId) : null,
    cardBrand: payment?.cardBrand ?? payment?.card_brand ?? null,
    cardLast4: payment?.cardLast4 ?? payment?.card_last4 ?? null,
  };
}

/**
 * ✅ 关键：用 Checkout 同一套逻辑从 item 里拿 unit_minor
 * 优先级：
 * 1) serverItems 字段：unit_price_minor / item_unit_price_minor
 * 2) 兼容：item.amount_minor / item.price_minor / item.real_price_minor
 * 3) 兼容：item.real_price / item.price（major -> minor）
 * 4) 兼容：itemToPriceRecs(item) 找 currency 对应 rec.amount_minor
 * 5) snapshot/options 再兜底
 */
function getUnitMinorSmart(it: any, currency: string): number {
  // (1) server 的字段
  const direct =
    it?.unit_price_minor ??
    it?.item_unit_price_minor ??
    it?.snapshot?.unit_price_minor ??
    it?.snapshot?.item_unit_price_minor ??
    null;
  if (isFiniteInt(direct)) return clampMinor(direct);

  // (2) 常见 minor 字段
  const minorCand =
    it?.amount_minor ??
    it?.price_minor ??
    it?.real_price_minor ??
    it?.snapshot?.amount_minor ??
    it?.snapshot?.price_minor ??
    it?.snapshot?.real_price_minor ??
    null;
  if (isFiniteInt(minorCand)) return clampMinor(minorCand);

  // (3) 常见 major 字段（real_price / price）
  const majorCand =
    it?.real_price ??
    it?.price ??
    it?.snapshot?.real_price ??
    it?.snapshot?.price ??
    null;
  const majorN = Number(majorCand);
  if (Number.isFinite(majorN) && majorN > 0) return Math.round(majorN * 100);

  // (4) ✅ Checkout 的价格 rec 逻辑
  try {
    const recs = itemToPriceRecs(it) as any[];
    const hit =
      recs?.find((r) => String(r?.currency || "").toUpperCase() === currency) ??
      recs?.[0];
    const v = hit?.amount_minor ?? hit?.price ?? null;
    if (isFiniteInt(v)) return clampMinor(v);
  } catch {}

  // (5) options 再兜底
  const optMinor =
    it?.options?.amount_minor ??
    it?.options?.price_minor ??
    it?.options?.real_price_minor ??
    it?.snapshot?.options?.amount_minor ??
    it?.snapshot?.options?.price_minor ??
    it?.snapshot?.options?.real_price_minor ??
    null;
  if (isFiniteInt(optMinor)) return clampMinor(optMinor);

  return 0;
}

function getLineMinorSmart(it: any, currency: string): number {
  const direct =
    it?.line_total_minor ??
    it?.item_line_total_minor ??
    it?.snapshot?.line_total_minor ??
    it?.snapshot?.item_line_total_minor ??
    null;
  if (isFiniteInt(direct)) return clampMinor(direct);

  // fallback: unit * qty
  return (getUnitMinorSmart(it, currency) * getQty(it)) | 0;
}

export default function OrderConfirmationPage() {
  const [preview, setPreview] = useState<Preview | null>(null);

  const [serverOrder, setServerOrder] = useState<ServerOrder | null>(null);
  const [serverItems, setServerItems] = useState<ServerItem[] | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);

  // ① 读取上一步保存的订单预览（用于 address / deliveryMethod / 兜底展示）
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("last-order-preview");
      if (raw) setPreview(JSON.parse(raw));
    } catch {}
  }, []);

  // ② 清空购物袋（当且仅当拿到 preview 时执行）
  useEffect(() => {
    if (!preview) return;
    try {
      localStorage.setItem("bag:v1", "[]");
      window.dispatchEvent(
        new CustomEvent("bag:count", { detail: { count: 0 } })
      );
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {}
  }, [preview]);

  // ③ 拿到 server order id 后，去后端拉真正 totals + items
  useEffect(() => {
    const id = pickOrderIdFromPreview(preview);
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoadingServer(true);
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: "GET",
          credentials: "include",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });

        const data: ServerResp | null = await res.json().catch(() => null);
        if (cancelled) return;

        if (res.ok && data?.ok && data.order) {
          setServerOrder(data.order);
          if (Array.isArray(data.items)) setServerItems(data.items);
        } else {
          console.warn("[order/confirmation] failed to fetch server order", {
            id,
            status: res.status,
            data,
          });
        }
      } catch (e) {
        console.warn("[order/confirmation] fetch server order error", e);
      } finally {
        if (!cancelled) setLoadingServer(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preview]);

  // ========= ✅ 下面这些 “计算” 不使用 useMemo（避免 hooks 顺序坑） =========

  const payload = preview?.payload ?? null;
  const payloadOrder = payload?.order ?? null;

  const currency = String(
    serverOrder?.currency || payloadOrder?.currency || preview?.currency || "AUD"
  ).toUpperCase();

  // items 数据源：serverItems -> preview.items
  const itemsToRender: any[] =
    Array.isArray(serverItems) && serverItems.length
      ? serverItems
      : Array.isArray(preview?.items)
      ? preview!.items
      : [];

  const itemCount = itemsToRender.reduce((n, it) => n + getQty(it), 0);

  // totals：serverOrder -> payload.order -> preview.totalMinor -> fallback 计算（你现在 summary 主要用 preview）
  const subtotalMinorRaw =
    serverOrder?.items_total_minor ??
    payloadOrder?.items_total_minor ??
    payloadOrder?.itemsTotalMinor ??
    null;

  const shippingMinorRaw =
    serverOrder?.delivery_fee_minor ??
    payloadOrder?.delivery_fee_minor ??
    payloadOrder?.deliveryFeeMinor ??
    payloadOrder?.shipping_minor ??
    payloadOrder?.shippingMinor ??
    null;

  const taxMinorRaw =
    serverOrder?.tax_minor ??
    payloadOrder?.tax_minor ??
    payloadOrder?.taxMinor ??
    0;

  const discountMinorRaw =
    serverOrder?.discount_minor ??
    payloadOrder?.discount_minor ??
    payloadOrder?.discountMinor ??
    0;

  // computed subtotal fallback from items
  const computedSubtotalFallback = itemsToRender.reduce(
    (sum, it) => (sum + getLineMinorSmart(it, currency)) | 0,
    0
  );

  const subtotalMinor = isFiniteInt(subtotalMinorRaw)
    ? clampMinor(subtotalMinorRaw)
    : computedSubtotalFallback;

  const shippingMinor = isFiniteInt(shippingMinorRaw)
    ? clampMinor(shippingMinorRaw)
    : 0;

  const taxMinor = isFiniteInt(taxMinorRaw) ? clampMinor(taxMinorRaw) : 0;
  const discountMinor = isFiniteInt(discountMinorRaw)
    ? clampMinor(discountMinorRaw)
    : 0;

  const totalMinor =
    (Number(serverOrder?.grand_total_minor) > 0 &&
      clampMinor(serverOrder?.grand_total_minor)) ||
    (Number(payloadOrder?.grand_total_minor) > 0 &&
      clampMinor(payloadOrder?.grand_total_minor)) ||
    (Number(payloadOrder?.grandTotalMinor) > 0 &&
      clampMinor(payloadOrder?.grandTotalMinor)) ||
    (preview ? clampMinor(preview.totalMinor) : 0) ||
    Math.max(0, (subtotalMinor + shippingMinor + taxMinor - discountMinor) | 0);

  const address = preview?.address ?? null;

  const serverOrderId = pickOrderIdFromPreview(preview);
  // ✅ 这里保留计算，但 UI 不再展示 payment details（你要求去掉）
  const paymentInfo = pickPaymentInfo(payload);

  const deliveryLabel = serverOrder?.delivery_option
    ? prettyDeliveryOption(serverOrder.delivery_option)
    : preview?.deliveryMethod === "express"
    ? "Express"
    : "Standard";

  // ✅ 你现在的 “右侧 summary” 以 preview.quote 为准（最稳）
  const shippingMinorFromPreview = isFiniteInt(
    (preview as any)?.quote?.delivery_fee_minor
  )
    ? clampMinor((preview as any)?.quote?.delivery_fee_minor)
    : 0;

  const totalMinorFromPreview = preview ? clampMinor(preview.totalMinor) : totalMinor;

  // ========= ✅ 早退视图 =========
  if (!preview) {
    return (
      <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">No order to show</h1>
          <p className="text-neutral-600 mb-6">
            We couldn’t find your latest order details. If you just paid, try
            refreshing this page.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium"
            >
              Back to Home
            </Link>
            <Link
              href="/checkout"
              className="rounded-md border bg-white px-4 py-2 text-sm font-medium"
            >
              Back to Checkout
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ✅ 成功提示 Header 卡片 */}
        <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full border bg-neutral-50 p-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Thanks for your order!
              </h1>
              <p className="mt-1 text-sm sm:text-base text-neutral-600">
                We’ve emailed your receipt and order details
                {address?.email ? ` to ${address.email}` : ""}.
              </p>

              {/* ✅ 顶部：去掉 Delivery badge（按你要求） */}
              <div className="mt-3 flex flex-wrap gap-2">
                {serverOrder?.order_number ? (
                  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
                    Order No:
                    <span className="ml-1 font-mono text-neutral-900">
                      {serverOrder.order_number}
                    </span>
                  </span>
                ) : null}

                {serverOrderId ? (
                  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
                    Order ID:
                    <span className="ml-1 font-mono text-neutral-900">
                      {serverOrderId}
                    </span>
                  </span>
                ) : null}

                {loadingServer ? (
                  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
                    Syncing…
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ 主体布局 */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          {/* 左侧：Items */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Items</h2>
              <div className="text-sm text-neutral-600">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-4 divide-y">
              {itemsToRender.length === 0 ? (
                <div className="py-8 text-sm text-neutral-500">
                  No items to show.
                </div>
              ) : (
                itemsToRender.map((it: any, idx: number) => {
                  const name = pickNameFromItem(it);
                  const variant = pickVariantFromItem(it);
                  const sku = pickSkuFromItem(it);
                  const qty = getQty(it);
                  const unit = getUnitMinorSmart(it, currency);
                  const line = getLineMinorSmart(it, currency);
                  const img = pickImageFromItem(it);

                  return (
                    <div key={String(it?.id ?? idx)} className="py-4 flex gap-4">
                      <div className="h-20 w-20 rounded-xl border bg-neutral-50 overflow-hidden flex items-center justify-center shadow-sm">
                        {img ? (
                          <img
                            src={img}
                            alt={name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-xs text-neutral-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{name}</div>
                            {variant ? (
                              <div className="text-sm text-neutral-600 mt-0.5">
                                {variant}
                              </div>
                            ) : null}
                            {sku ? (
                              <div className="text-[11px] text-neutral-400 mt-1">
                                SKU: <span className="font-mono">{sku}</span>
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
                })
              )}
            </div>
          </section>

          {/* 右侧：Summary + Delivery */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            {/* Summary */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Order Summary</h2>
                <span className="text-xs text-neutral-500">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Delivery fee</span>
                  <span className="font-medium text-neutral-900">
                    {shippingMinorFromPreview === 0
                      ? "FREE"
                      : fmtMoneyMinor(shippingMinorFromPreview, currency)}
                  </span>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">
                    {fmtMoneyMinor(totalMinorFromPreview, currency)}
                  </span>
                </div>
              </div>

              {/* ✅ 按你要求：移除 Payment / PayPal Order ID / Transaction ID 区块 */}
              {/* paymentInfo 仍保留在代码里（将来你需要时再加回 UI 很方便） */}
            </section>

            {/* Delivery Details */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Delivery Details</h2>

              {address ? (
                <div className="mt-3 text-sm leading-6 text-neutral-800">
                  <div className="font-medium text-neutral-900">
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
                  <div>{countryLabelOf(address.country)}</div>
                  {address.phone ? <div>{address.phone}</div> : null}
                </div>
              ) : (
                <div className="mt-3 text-sm text-neutral-500">
                  No address provided.
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-xl border bg-neutral-50/60 px-3 py-2 text-sm">
                <span className="text-neutral-600">Delivery method</span>
                <span className="font-semibold text-neutral-900">
                  {deliveryLabel}
                </span>
              </div>
            </section>

            {/* CTA */}
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
