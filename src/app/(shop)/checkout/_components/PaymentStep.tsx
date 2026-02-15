// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import PayPalBigButton from "./PayPalBigButton";
import { countryLabelOf } from "@/lib/country";
import { mediaUrl } from "@/lib/strapi";
import { Alert } from "@/components/ui/alert";

/* ========== Phase 1 / Step 3: stock preflight types ========== */
type StockCheckItem = { sku: string; qty: number };

type StockCheckOkItem = {
  sku: string;
  requested: number;
  stock: number;
  ok: boolean;
  found?: boolean;
};

type StockCheckApiResp =
  | { ok: true; items: StockCheckOkItem[] }
  | {
      ok: false;
      error: string;
      message?: string;
      detail?: any;
      items?: StockCheckOkItem[];
    };

function getCartSku(it: any): string {
  return String(it?.product_sku ?? it?.sku ?? it?.variantSku ?? it?.variant_sku ?? "").trim();
}

function buildStockCheckItems(cart: any[]): StockCheckItem[] {
  const list = Array.isArray(cart) ? cart : [];
  const map = new Map<string, number>();

  for (const it of list) {
    const sku = getCartSku(it);
    const qty = Math.max(1, Number(it?.qty) || 1);
    if (!sku) continue;
    map.set(sku, (map.get(sku) ?? 0) + qty);
  }

  return Array.from(map.entries()).map(([sku, qty]) => ({ sku, qty }));
}

async function preflightStockCheck(items: StockCheckItem[]): Promise<{
  httpStatus: number;
  data: StockCheckApiResp | null;
}> {
  const res = await fetch("/api/stock/check", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });

  const data: any = await res.json().catch(() => null);
  return { httpStatus: res.status, data };
}

/* ========== 类型 ========== */
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
  country?: string; // ISO2: "AU"
};

type DeliveryMethod = "standard" | "express";

type PaymentStepProps = {
  visible: boolean;

  amountInMajorUnit: number; // legacy, 不当权威

  isPayProcessing: boolean;
  address: Address;

  deliveryMethod: DeliveryMethod;

  itemsCount: number;
  itemsMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;

  onPayInitiated: () => void;
  onPaySucceeded: (payload?: any) => void;
  onBackToBag?: () => void; // ✅ NEW: let parent control step switch

  cart: Array<{
    price?: number; // major（折后价）
    qty?: number;
    currency?: string;
    [k: string]: any;
  }>;
};

/* ========== 金额格式化小工具 ========== */
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

/** 把后端 options 里的 heightIncreaseCm / height_cm / height_increase_cm 统一成人类可读 */
function buildVariantLineFromOptions(options: any): string {
  const opt = options ?? {};
  const color = String(opt?.color ?? "").trim();
  const size = String(opt?.size ?? "").trim();

  const hRaw =
    opt?.heightIncreaseCm ??
    opt?.height_cm ??
    opt?.height_increase_cm ??
    null;

  let height_cm: number | null = null;
  if (hRaw === 0 || hRaw === "0") height_cm = 0;
  else if (hRaw == null) height_cm = null;
  else if (typeof hRaw === "string" && hRaw.trim() === "") height_cm = null;
  else {
    const n = Number(hRaw);
    height_cm = Number.isFinite(n) ? n : null;
  }

  const parts: string[] = [];
  if (color) parts.push(`Color: ${color}`);
  if (size) parts.push(`Size: ${size}`);
  if (height_cm != null) parts.push(`Height: +${height_cm} cm`);

  return parts.join(" | ");
}

type PayError =
  | {
      type: "out_of_stock";
      message: string;
      detail?: {
        sku?: string;
        current?: number;
        requested?: number;

        // ✅ Phase 2: allow server to pass richer info (方案1：不改DB不额外查Strapi)
        product_title?: string;
        variant_title?: string;
        options?: any;
      };
    }
  | {
      type: "sku_not_found";
      message: string;
      detail?: { sku?: string };
    }
  | {
      type: "stock_lookup_failed";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "amount_mismatch" | "stock_update_failed" | "server_error" | "unknown";
      message: string;
      detail?: any;
      status?: number;
    };

const PaymentStep: React.FC<PaymentStepProps> = ({
  visible,
  amountInMajorUnit, // legacy
  isPayProcessing,
  address,
  deliveryMethod,
  itemsCount,
  itemsMinor,
  deliveryFeeMinor,
  totalMinor,
  currency,
  onPayInitiated,
  onPaySucceeded,
  cart,
  onBackToBag, // ✅ NEW
}) => {
  const router = useRouter();

  const [method, setMethod] = useState<"card" | "paypal">("paypal");
  const [suppressBlockedHint, setSuppressBlockedHint] = useState(false);

  // ✅ 用于显示“缺货/下单失败”等错误
  const [payError, setPayError] = useState<PayError | null>(null);

  const safeCurrency = useMemo(() => {
    return (currency || cart?.[0]?.currency || "AUD").toUpperCase();
  }, [currency, cart]);

  const derivedItemsCount = useMemo(() => {
    const list = Array.isArray(cart) ? cart : [];
    return list.reduce((sum, it) => sum + Math.max(1, Number(it?.qty) || 1), 0);
  }, [cart]);

  const derivedItemsMinor = useMemo(() => {
    const list = Array.isArray(cart) ? cart : [];
    return list.reduce((sum, it) => {
      const qty = Math.max(1, Number(it?.qty) || 1);

      const priceMajor = Number(it?.price) || 0;
      const unitMinor = Math.round(priceMajor * 100);
      const lineMinor = unitMinor * qty;

      return sum + Math.max(0, lineMinor);
    }, 0);
  }, [cart]);

  const derivedTotalMinor = useMemo(() => {
    return Math.max(0, derivedItemsMinor + (Number(deliveryFeeMinor) || 0));
  }, [derivedItemsMinor, deliveryFeeMinor]);

  const derivedAmountMajor = useMemo(() => {
    return Number((derivedTotalMinor / 100).toFixed(2));
  }, [derivedTotalMinor]);

  const handlePaySucceeded = useCallback(
    (payload: any) => {
      setPayError(null);
      setSuppressBlockedHint(true);
      onPaySucceeded(payload);
    },
    [onPaySucceeded]
  );

  const handlePayFailed = useCallback((err: any) => {
    const status = Number(err?.status ?? err?.httpStatus ?? 0) || undefined;
    const code = String(err?.code ?? err?.error ?? "").trim();

    if (status === 409 && code === "out_of_stock") {
      // ✅ 兼容：err.detail 可能来自 /orders 或 /stock/check
      const d = err?.detail ?? {};
      const sku = d?.sku ?? err?.sku;
      const current = d?.current ?? err?.current;
      const requested = d?.requested ?? err?.requested;

      // ✅ Phase 2: 接住更丰富信息（来自 d1-worker /orders out_of_stock）
      const product_title = d?.product_title ?? d?.productTitle ?? null;
      const variant_title = d?.variant_title ?? d?.variantTitle ?? null;
      const options = d?.options ?? null;

      setPayError({
        type: "out_of_stock",
        message:
          "Sorry — the item you’re trying to purchase is out of stock (sold out or not enough quantity).",
        detail: { sku, current, requested, product_title, variant_title, options },
      });
      return;
    }

    if (status === 409 && code === "sku_not_found") {
      setPayError({
        type: "sku_not_found",
        message:
          "Sorry — we couldn’t find one of the items in your bag in our inventory (SKU mismatch). Please go back to your bag, refresh, and try again.",
        detail: { sku: err?.detail?.sku ?? err?.sku },
      });
      return;
    }

    if (status === 502 && code === "stock_lookup_failed") {
      setPayError({
        type: "stock_lookup_failed",
        status,
        message:
          "Sorry — we can’t verify stock right now (inventory service temporarily unavailable). Please try again shortly.",
        detail: err?.detail ?? err ?? null,
      });
      return;
    }

    if (status === 400 && code === "amount_mismatch") {
      setPayError({
        type: "amount_mismatch",
        status,
        message: "Your order total has changed. Please refresh the page and check out again.",
        detail: err?.detail ?? null,
      });
      return;
    }

    if (status === 500 && code === "stock_update_failed") {
      setPayError({
        type: "stock_update_failed",
        status,
        message: "Stock update failed. Please try again shortly.",
        detail: err?.detail ?? null,
      });
      return;
    }

    setPayError({
      type: "unknown",
      status,
      message: err?.message || "Payment failed. Please try again.",
      detail: err?.detail ?? err ?? null,
    });
  }, []);

  const hasAddress =
    address?.firstName ||
    address?.lastName ||
    address?.line1 ||
    address?.city ||
    address?.state ||
    address?.postcode;

  const payBlockedReason = useMemo(() => {
    if (!visible) return null;
    if (isPayProcessing) return null;
    if (suppressBlockedHint) return null;

    if (derivedItemsCount <= 0) {
      return "Your bag is empty. Please add at least one item before paying.";
    }
    if (!hasAddress) {
      return "No delivery address found. Please complete the Address step before paying.";
    }
    if (derivedTotalMinor <= 0) {
      return "Invalid total amount. Please review your order.";
    }
    return null;
  }, [visible, isPayProcessing, suppressBlockedHint, derivedItemsCount, hasAddress, derivedTotalMinor]);

  const countryDisplay = useMemo(() => {
    const raw = (address?.country || "").trim();
    if (!raw) return "";
    const label = countryLabelOf(raw);
    return label || raw;
  }, [address?.country]);

  /**
   * ✅ 缺货展示信息：优先从 cart snapshot 取；找不到再用后端 detail（方案1）
   */
  const outOfStockDisplay = useMemo(() => {
    if (!payError || payError.type !== "out_of_stock") return null;

    const sku = String(payError.detail?.sku || "").trim();
    const list = Array.isArray(cart) ? cart : [];

    const hit =
      sku
        ? list.find((it: any) => {
            const s = getCartSku(it);
            return s && s === sku;
          })
        : null;

    // ---------- title ----------
    const titleFromCart = String(hit?.title ?? hit?.product_title ?? hit?.name ?? "").trim();
    const titleFromServer = String(payError.detail?.product_title ?? "").trim();

    const title = titleFromCart || titleFromServer || "";

    // ---------- options ----------
    const attrs = hit?.attrs ?? hit?.snapshot?.attrs ?? {};
    const options = hit?.options ?? hit?.snapshot?.options ?? {};

    const color = String(hit?.color ?? options?.color ?? attrs?.color ?? "").trim();
    const size = String(hit?.size ?? options?.size ?? attrs?.size ?? "").trim();

    const height =
      hit?.heightIncreaseCm ??
      options?.heightIncreaseCm ??
      attrs?.heightIncreaseCm ??
      attrs?.height_increase_cm ??
      null;

    const material = String(hit?.material ?? options?.material ?? attrs?.material ?? "").trim();

    const heightLabel = typeof height === "number" ? `${height} cm` : String(height || "").trim();

    const variantParts = [
      color ? `Color: ${color}` : null,
      size ? `Size: ${size}` : null,
      heightLabel ? `Height: +${heightLabel}` : null,
      material ? `Material: ${material}` : null,
    ].filter(Boolean);

    const variantLineFromCart = variantParts.join(" | ").trim();

    // 后端 detail 可能已经给了一个完整 variant_title
    const variantTitleFromServer = String(payError.detail?.variant_title ?? "").trim();

    // 或者后端给了 options，我们在前端生成
    const variantLineFromServerOptions = buildVariantLineFromOptions(payError.detail?.options);

    const variantLine =
      variantLineFromCart ||
      variantTitleFromServer ||
      variantLineFromServerOptions ||
      "";

    return {
      title: title || null,
      variantLine: variantLine || null,
      sku: sku || null, // 不展示，只用于匹配/调试
      current: payError.detail?.current,
      requested: payError.detail?.requested,
    };
  }, [payError, cart]);

  const goBackToBag = useCallback(() => {
    // ✅ 先走父级：同时更新 step state + URL（最稳）
    if (typeof onBackToBag === "function") {
      onBackToBag();
      return;
    }

    // fallback（理论上不会走到）
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("step", "bag");
      router.push(u.pathname + "?" + u.searchParams.toString());
      return;
    } catch {}
    router.push("/checkout?step=bag");
  }, [onBackToBag, router]);

  // ✅ 给后端 /orders 的权威 totals + items snapshot（你原来的逻辑保留）
  const checkoutTotalsMeta = useMemo(() => {
    const itemsSnapshot = (Array.isArray(cart) ? cart : []).map((it) => {
      const qty = Math.max(1, Number(it?.qty) || 1);

      const unitMinor = Math.round((Number(it?.price) || 0) * 100);
      const lineMinor = unitMinor * qty;

      const rawImage =
        it?.image ??
        it?.img ??
        it?.image_url ??
        it?.attrs?.image ??
        it?.attrs?.thumbnail ??
        it?.attrs?.cover ??
        it?.attrs?.images?.[0] ??
        it?.images?.[0] ??
        it?.snapshot?.image ??
        it?.snapshot?.image_url ??
        it?.snapshot?.attrs?.image ??
        null;

      const computedImageUrl = rawImage ? mediaUrl(rawImage) : null;

      const prevSnap = (it as any)?.snapshot ?? {};
      const nextSnap = {
        ...prevSnap,
        image: prevSnap?.image ?? rawImage ?? null,
        image_url: prevSnap?.image_url ?? computedImageUrl ?? null,
        attrs: {
          ...(prevSnap?.attrs ?? {}),
          ...(it as any)?.attrs,
        },
      };

      return {
        ...it,
        qty,
        unit_price_minor: unitMinor,
        line_total_minor: lineMinor,

        image: (it as any)?.image ?? rawImage ?? null,
        image_url: (it as any)?.image_url ?? computedImageUrl ?? null,

        snapshot: nextSnap,
      };
    });

    return {
      pricing_source: "paymentstep-derived",
      currency: safeCurrency,
      items_count: derivedItemsCount,
      items_total_minor: derivedItemsMinor,
      delivery_fee_minor: Number(deliveryFeeMinor) || 0,
      total_minor: derivedTotalMinor,
      items: itemsSnapshot,
    };
  }, [cart, safeCurrency, derivedItemsCount, derivedItemsMinor, deliveryFeeMinor, derivedTotalMinor]);

  // ✅ Phase 1 / Step 3: stock items from cart
  const stockItems = useMemo(() => buildStockCheckItems(cart as any[]), [cart]);

  const runStockPreflight = useCallback(async () => {
    if (!stockItems.length) {
      throw { status: 400, code: "no_items", message: "No items to check." };
    }

    const { httpStatus, data } = await preflightStockCheck(stockItems);

    if (httpStatus === 200 && data && (data as any).ok === true) {
      const items = Array.isArray((data as any).items) ? ((data as any).items as StockCheckOkItem[]) : [];
      const firstBad = items.find((x) => x && x.ok === false);

      if (firstBad) {
        throw {
          status: 409,
          code: "out_of_stock",
          message: "Stock preflight failed.",
          detail: { sku: firstBad.sku, current: firstBad.stock, requested: firstBad.requested },
        };
      }
      return;
    }

    const errCode = String((data as any)?.error || `http_${httpStatus}`);
    const detail = (data as any)?.detail ?? null;
    const items = Array.isArray((data as any)?.items) ? ((data as any).items as StockCheckOkItem[]) : [];

    if (httpStatus === 409 && errCode === "out_of_stock") {
      const sku = String(detail?.sku ?? "").trim();
      const current = detail?.current;
      const requested = detail?.requested;

      if (sku) {
        throw { status: 409, code: "out_of_stock", message: "Stock preflight failed.", detail: { sku, current, requested } };
      }

      const firstBad = items.find((x) => x && x.ok === false);
      if (firstBad) {
        throw {
          status: 409,
          code: "out_of_stock",
          message: "Stock preflight failed.",
          detail: { sku: firstBad.sku, current: firstBad.stock, requested: firstBad.requested },
        };
      }

      throw { status: 409, code: "out_of_stock", message: "Stock preflight failed.", detail: detail ?? { items } };
    }

    if (httpStatus === 409 && errCode === "sku_not_found") {
      throw { status: 409, code: "sku_not_found", message: "SKU not found.", detail: detail ?? { items } };
    }

    if (httpStatus === 502 && errCode === "stock_lookup_failed") {
      throw { status: 502, code: "stock_lookup_failed", message: "Stock lookup failed.", detail: detail ?? { items } };
    }

    throw {
      status: httpStatus || 500,
      code: "stock_check_failed",
      message: `Stock check failed: ${errCode}`,
      detail: { httpStatus, data },
    };
  }, [stockItems]);

  return (
    <section
      className="rounded-xl border bg-white min-h-[720px] flex flex-col"
      aria-hidden={!visible}
      style={
        visible
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
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Step 4</div>
          <div className="text-base font-semibold text-neutral-900">Payment Options</div>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <Check className="w-4 h-4" />
          <span>Secure checkout</span>
        </div>
      </div>

      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 flex gap-2">
          <span className="mt-0.5 text-base">ℹ️</span>
          <div>
            <div className="font-medium">Make sure your delivery address is correct!</div>
            <div className="text-xs text-blue-900">You can go back to the Address step to make changes.</div>
          </div>
        </div>

        {visible && payError && (
          <Alert variant="error" className="flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">{payError.message}</div>

              {payError.type === "out_of_stock" && (
                <div className="mt-2 text-xs leading-5">
                  {outOfStockDisplay?.title ? (
                    <div>
                      <b>Item:</b> {outOfStockDisplay.title}
                    </div>
                  ) : null}

                  {outOfStockDisplay?.variantLine ? (
                    <div>
                      <b>Variant:</b> {outOfStockDisplay.variantLine}
                    </div>
                  ) : null}

                  <div className="mt-1">
                    <b>In stock:</b>{" "}
                    {typeof outOfStockDisplay?.current === "number" ? outOfStockDisplay.current : "N/A"}
                    {"  "}
                    <span className="mx-1">|</span>
                    <b>You selected:</b>{" "}
                    {typeof outOfStockDisplay?.requested === "number" ? outOfStockDisplay.requested : "N/A"}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={goBackToBag}
                      className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                    >
                      Back to bag
                    </button>
                  </div>

                  <div className="mt-2">
                    Please adjust the quantity or remove the item in your bag, then try paying again.
                  </div>
                </div>
              )}

              {payError.type === "sku_not_found" && (
                <div className="mt-1 text-xs">
                  {payError.detail?.sku ? (
                    <div>
                      <b>SKU:</b> {payError.detail.sku}
                    </div>
                  ) : null}
                </div>
              )}

              {payError.type === "stock_lookup_failed" && (
                <div className="mt-1 text-xs">
                  Please try again shortly, or refresh the page and check out again.
                </div>
              )}
            </div>
          </Alert>
        )}

        {visible && payBlockedReason && (
          <Alert variant="error" className="flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>{payBlockedReason}</div>
          </Alert>
        )}

        <div className="flex-1 flex flex-col">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
            <div className="border rounded-lg p-4 h-[460px] flex flex-col">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900">Choose a way to pay</h3>

                <button
                  type="button"
                  onClick={() => setMethod("paypal")}
                  className={[
                    "w-full flex items-center justify-between rounded-md border px-3 py-3 text-sm text-left",
                    method === "paypal" ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  <span className="font-medium">PayPal</span>
                  <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
                    <div className="relative h-6 w-14">
                      <Image src="/cards/paypal.svg" alt="PayPal" fill className="object-contain" />
                    </div>
                  </span>
                </button>
              </div>

              <div className="mt-5 border-t pt-4 flex-1 flex flex-col">
                <div className="flex-1" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-base font-medium mb-3">Delivery Details</h3>
                {hasAddress ? (
                  <div className="text-sm leading-6 text-gray-800 space-y-0.5">
                    <div>{[address.firstName, address.lastName].filter(Boolean).join(" ")}</div>

                    {address.line1 && (
                      <div>
                        {address.line1}
                        {address.line2 ? ` ${address.line2}` : ""}
                      </div>
                    )}

                    {(address.city || address.state || address.postcode) && (
                      <div>
                        {[address.city, address.state, address.postcode].filter(Boolean).join(" ")}
                      </div>
                    )}

                    {countryDisplay && <div>{countryDisplay}</div>}
                    {address.email && <div className="mt-2">{address.email}</div>}
                    {address.phone && <div>{address.phone}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No delivery address found. Please complete the <b>Address</b> step.
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Items</div>
                  <div className="text-base font-medium">
                    {derivedItemsCount} item{derivedItemsCount > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Subtotal</div>
                  <div className="text-base font-medium">{fmtMoneyMinor(derivedItemsMinor, safeCurrency)}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Delivery</div>
                  <div className="text-base font-medium">
                    {Number(deliveryFeeMinor) === 0 ? "FREE" : fmtMoneyMinor(Number(deliveryFeeMinor) || 0, safeCurrency)}
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Total</div>
                  <div className="text-xl font-bold">{fmtMoneyMinor(derivedTotalMinor, safeCurrency)}</div>
                </div>
              </div>

              {visible && derivedAmountMajor > 0 && (
                <div className="pt-0 flex justify-end">
                  <div className="w-[260px] max-w-full">
                    {isPayProcessing ? (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-full px-6 py-3 text-sm font-semibold bg-[#FFC439] text-[#111827] opacity-70 cursor-not-allowed"
                      >
                        Processing payment...
                      </button>
                    ) : payBlockedReason ? (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-full px-6 py-3 text-sm font-semibold bg-[#FFC439] text-[#111827] opacity-70 cursor-not-allowed"
                      >
                        PayPal unavailable
                      </button>
                    ) : (
                      <PayPalBigButton
                        amount={derivedAmountMajor}
                        currency={safeCurrency}
                        successMeta={{
                          checkoutTotals: checkoutTotalsMeta,
                          address,
                          deliveryOption: deliveryMethod,
                          meta: { pricing_source: "paymentstep-derived" },
                        }}
                        preflight={runStockPreflight}
                        preflightItems={stockItems}
                        onInitiate={() => {
                          setPayError(null);
                          setSuppressBlockedHint(true);
                          onPayInitiated();
                        }}
                        onSucceeded={(paypalPayload) => {
                          handlePaySucceeded(paypalPayload);
                        }}
                        onFailed={(err: any) => {
                          handlePayFailed(err);
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-1 text-xs text-gray-500">
          <p>
            All charges are processed in <b>{safeCurrency}</b>. Your bank or PayPal may apply currency conversion and fees.
          </p>
          <p>* Pay in 4 availability is determined by PayPal and may vary by account and region.</p>
        </div>
      </div>
    </section>
  );
};

export default PaymentStep;
