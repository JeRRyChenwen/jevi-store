// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import PayPalBigButton from "./PayPalBigButton";
import { countryLabelOf } from "@/lib/country";
import { mediaUrl } from "@/lib/strapi";
import { Alert } from "@/components/ui/alert";

/* ========== Phase 2: reserve/release types ========== */
type StockCheckItem = { sku: string; qty: number };

function getCartSku(it: any): string {
  return String(it?.product_sku ?? it?.sku ?? it?.variantSku ?? it?.variant_sku ?? "").trim();
}

function buildStockItems(cart: any[]): StockCheckItem[] {
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

function buildCartHash(items: StockCheckItem[]): string {
  const pairs = (items || [])
    .map((x) => `${String(x.sku).trim()}:${Math.max(1, Math.floor(Number(x.qty) || 1))}`)
    .sort();
  return pairs.join("|");
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
  onBackToBag?: () => void; // let parent control step switch

  cart: Array<{
    price?: number; // major（折后价）
    qty?: number;
    currency?: string;
    [k: string]: any;
  }>;

  preReservationId?: string | null;
  preReservationExpiresAtSec?: number | null;
  preReservationCartHash?: string | null;
  preReserveLoading?: boolean;
  preReserveError?: string | null;
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

  const hRaw = opt?.heightIncreaseCm ?? opt?.height_cm ?? opt?.height_increase_cm ?? null;

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
        product_title?: string;
        variant_title?: string;
        options?: any;
      };
    }
  | {
      type: "reservation_failed";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "reservation_expired";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "amount_mismatch";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "server_error";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "unknown";
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
  onBackToBag,
  preReservationId,
  preReservationExpiresAtSec,
  preReservationCartHash,
  preReserveLoading,
  preReserveError,
}) => {
  const router = useRouter();

  const [method, setMethod] = useState<"card" | "paypal">("paypal");
  const [suppressBlockedHint, setSuppressBlockedHint] = useState(false);

  // 缺货/失败等错误
  const [payError, setPayError] = useState<PayError | null>(null);

  const payErrorRef = useRef<PayError | null>(null);
  useEffect(() => {
    payErrorRef.current = payError;
  }, [payError]);

  // ✅ Phase 2: reservation state
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<number | null>(null);
  const paidOrSucceededRef = useRef(false); // 用来防止已成功支付还去 release

  // ✅ IMPORTANT: this ref must be kept in sync with state
  const reservationIdRef = useRef<string | null>(null);

  // ✅ NEW: countdown UI (seconds left)
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState<number | null>(null);



  // ✅ NEW: make checkout session id stable across React StrictMode remounts (dev)
  // key should be stable per checkout tab/session
  const CHECKOUT_SESSION_KEY = "sp.checkout.session_id";

  const checkoutSessionIdRef = useRef<string>("");

  if (!checkoutSessionIdRef.current) {
    try {
      // 1) try restore
      const existing =
        typeof window !== "undefined" ? sessionStorage.getItem(CHECKOUT_SESSION_KEY) : null;

      if (existing && existing.trim()) {
        checkoutSessionIdRef.current = existing.trim();
      } else {
        // 2) create once
        const fresh =
          typeof crypto !== "undefined" && (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : `cs_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        checkoutSessionIdRef.current = fresh;

        try {
          sessionStorage.setItem(CHECKOUT_SESSION_KEY, fresh);
        } catch {}
      }
    } catch {
      checkoutSessionIdRef.current = `cs_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  const safeCurrency = useMemo(() => {
    return (currency || cart?.[0]?.currency || "AUD").toUpperCase();
  }, [currency, cart]);

  // ✅ Phase 2: stock items from cart（必须放在 payBlockedReason 之前）
  const stockItems = useMemo(() => buildStockItems(cart as any[]), [cart]);

  // ✅ cart_hash（与 page.tsx / worker 对齐）（必须放在 payBlockedReason 之前）
  const cartHash = useMemo(() => buildCartHash(stockItems), [stockItems]);

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

  if (derivedItemsCount <= 0) return "Your bag is empty. Please add at least one item before paying.";
  if (!hasAddress) return "No delivery address found. Please complete the Address step before paying.";

  // ✅ PaymentStep 不再 reserve，所以必须依赖 Address step 的 preReservation
  const rid = String(preReservationId || "").trim();
  const preHash = String(preReservationCartHash || "").trim();
  const expSec = Number(preReservationExpiresAtSec || 0);
  const expMs = Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : 0;

  if (!rid) return "No stock reservation found. Please go back to the Address step and reserve again.";
  if (preHash && preHash !== cartHash) return "Your bag changed. Please go back to the Address step and reserve again.";
  if (!expMs) return "Invalid reservation. Please go back to the Address step and reserve again.";
  if (Date.now() >= expMs - 1000) return "Your stock reservation has expired. Please go back to the Address step and reserve again.";

  if (derivedTotalMinor <= 0) return "Invalid total amount. Please review your order.";
  return null;
}, [
  visible,
  isPayProcessing,
  suppressBlockedHint,
  derivedItemsCount,
  hasAddress,
  derivedTotalMinor,
  preReservationId,
  preReservationCartHash,
  preReservationExpiresAtSec,
  cartHash,
]);



  const countryDisplay = useMemo(() => {
    const raw = (address?.country || "").trim();
    if (!raw) return "";
    const label = countryLabelOf(raw);
    return label || raw;
  }, [address?.country]);

  /**
   * ✅ 缺货展示信息：优先从 cart snapshot 取；找不到再用后端 detail
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

    const titleFromCart = String(hit?.title ?? hit?.product_title ?? hit?.name ?? "").trim();
    const titleFromServer = String(payError.detail?.product_title ?? "").trim();
    const title = titleFromCart || titleFromServer || "";

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
    const variantTitleFromServer = String(payError.detail?.variant_title ?? "").trim();
    const variantLineFromServerOptions = buildVariantLineFromOptions(payError.detail?.options);

    const variantLine = variantLineFromCart || variantTitleFromServer || variantLineFromServerOptions || "";

    return {
      title: title || null,
      variantLine: variantLine || null,
      sku: sku || null,
      current: payError.detail?.current,
      requested: payError.detail?.requested,
    };
  }, [payError, cart]);

  // ✅ 同步 page.tsx 预加载的 reservation → PaymentStep 内部状态
  useEffect(() => {
    const rid = String(preReservationId || "").trim();
    const expSec = Number(preReservationExpiresAtSec || 0);
    const preHash = String(preReservationCartHash || "").trim();

    if (!rid || !Number.isFinite(expSec) || expSec <= 0) return;

    // 必须 cart_hash 一致才复用（避免用户改了 bag）
    if (preHash && preHash !== cartHash) return;

    const expMs = expSec * 1000;
    if (Date.now() >= expMs - 1000) return; // 已过期/即将过期不复用

    // 只在本地还没有有效 reservation 时写入（避免覆盖更“新”的）
    const localValid =
      reservationId &&
      reservationExpiresAt &&
      Date.now() < reservationExpiresAt - 1000;

    if (localValid) return;

    setReservationId(rid);
    setReservationExpiresAt(expMs);
    reservationIdRef.current = rid;
    setPayError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preReservationId, preReservationExpiresAtSec, preReservationCartHash, cartHash]);







  const handlePaySucceeded = useCallback(
    (payload: any) => {
      setPayError(null);
      setSuppressBlockedHint(true);

      // ✅ 已成功：不要再 release
      paidOrSucceededRef.current = true;

      // 成功后把 reservation 状态清掉（后端 /orders 会 consume）
      setReservationId(null);
      setReservationExpiresAt(null);
      setReservationSecondsLeft(null);
      reservationIdRef.current = null;

      onPaySucceeded(payload);
    },
    [onPaySucceeded]
  );

  /**
   * ✅ 把后端 /orders + 前端 preflight 错误码，映射成更电商的文案
   * - 不加按钮（按你要求）
   * - 仍然复用你 out_of_stock 的 rich display
   */
  const handlePayFailed = useCallback(
  async (err: any) => {
    const status = Number(err?.status ?? err?.httpStatus ?? 0) || undefined;

    // ✅ PayPalBigButton 现在用 code
    const code = String(err?.code ?? err?.error ?? "").trim();
    const messageFromServer = String(err?.message || "").trim();
    const detail = err?.detail ?? null;

    // ---------- 1) Out of stock ----------
    if (
      status === 409 &&
      (code === "out_of_stock" || code === "consume_out_of_stock" || code === "sku_not_found")
    ) {
      const d = detail ?? {};
      const firstItem = Array.isArray(d?.items) ? d.items[0] : null;

      const sku = d?.sku ?? err?.sku ?? firstItem?.sku ?? null;
      const requested = d?.requested ?? err?.requested ?? firstItem?.qty ?? null;
      const current = d?.current ?? err?.current ?? null;

      const product_title = d?.product_title ?? d?.productTitle ?? null;
      const variant_title = d?.variant_title ?? d?.variantTitle ?? null;
      const options = d?.options ?? null;

      setPayError({
        type: "out_of_stock",
        message:
          code === "sku_not_found"
            ? "Sorry — one of the items in your bag is no longer available."
            : "Sorry — the item you’re trying to purchase is out of stock (sold out or not enough quantity).",
        detail: { sku, current, requested, product_title, variant_title, options },
      });
      return;
    }

    // ---------- 2) Reservation lifecycle ----------
    if (status === 409 && code === "reservation_expired") {
      setPayError({
        type: "reservation_expired",
        status,
        message: "Your stock reservation has expired. Please go back to Address and reserve again.",
        detail: detail ?? err ?? null,
      });
      return;
    }

    if (
      (status === 409 || status === 404) &&
      (code.startsWith("reservation_") || code === "reservation_mismatch")
    ) {
      if (code === "reservation_already_consumed") {
        setPayError({
          type: "reservation_failed",
          status: status ?? 409,
          message:
            "We’re confirming your order. If you don’t see a confirmation page, please refresh and check your orders.",
          detail: detail ?? err ?? null,
        });
        return;
      }

      if (code === "reservation_not_found") {
        setPayError({
          type: "reservation_failed",
          status: status ?? 404,
          message: "We couldn’t find your stock reservation. Please go back to Address and reserve again.",
          detail: detail ?? err ?? null,
        });
        return;
      }

      setPayError({
        type: "reservation_failed",
        status: status ?? 409,
        message:
          code === "reservation_mismatch"
            ? "Your bag changed during checkout. Please go back to Address and reserve again."
            : code === "reservation_already_released"
            ? "Your reservation was released. Please go back to Address and reserve again."
            : "We couldn’t confirm your stock reservation. Please go back to Address and reserve again.",
        detail: detail ?? err ?? null,
      });
      return;
    }

    // ---------- 3) Amount mismatch ----------
    if (status === 400 && code === "amount_mismatch") {
      setPayError({
        type: "amount_mismatch",
        status,
        message: "Your order total has changed. Please refresh the page and check out again.",
        detail: detail ?? null,
      });
      return;
    }

    // ---------- 4) Server side / internal ----------
    if (status && status >= 500) {
      setPayError({
        type: "server_error",
        status,
        message: "We couldn’t complete your checkout due to a server issue. Please try again.",
        detail: detail ?? err ?? null,
      });
      return;
    }

    // ---------- 5) Fallback ----------
    setPayError({
      type: "unknown",
      status,
      message: messageFromServer || "Payment failed. Please try again.",
      detail: detail ?? err ?? null,
    });
  },
  [] // ✅ 现在不依赖任何外部函数（releaseReservationIfAny 已删除）
);

  // ✅ 给后端 /orders 的权威 totals + items snapshot（保留你原来的逻辑）
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

  /**
   * ✅ Phase 2 preflight：reserve
   */
  const runStockReservePreflight = useCallback(async (): Promise<string> => {
  /**
   * ✅ PaymentStep 不再创建 reserve
   * ✅ 这里只做校验：必须依赖 Address step 传入的 preReservation
   */

  // 1) 必须有 items（否则 PayPal 点击没意义）
  if (!stockItems.length) {
    throw {
      status: 400,
      code: "no_items",
      error: "no_items",
      message: "No items to pay for.",
      detail: { items: [] },
    };
  }

  // 2) 必须有 preReservationId（PaymentStep 不负责 reserve）
  const rid = String(preReservationId || "").trim();
  if (!rid) {
    throw {
      status: 404,
      code: "reservation_not_found",
      error: "reservation_not_found",
      message: "No stock reservation found. Please go back to Address and reserve again.",
      detail: { preReservationId: preReservationId ?? null },
    };
  }

  // 3) 必须 cart_hash 一致（防止 bag 改了）
  const preHash = String(preReservationCartHash || "").trim();
  if (preHash && preHash !== cartHash) {
    throw {
      status: 409,
      code: "reservation_mismatch",
      error: "reservation_mismatch",
      message: "Your bag changed during checkout. Please go back to Address and reserve again.",
      detail: { preHash, cartHash, reservation_id: rid },
    };
  }

  // 4) 必须没过期（Address step 传入 expiresAtSec）
  const expSec = Number(preReservationExpiresAtSec || 0);
  const expMs = Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : 0;

  // 如果没传 expires（不建议），就当作失败
  if (!expMs) {
    throw {
      status: 409,
      code: "reservation_invalid",
      error: "reservation_invalid",
      message: "Invalid reservation expiry. Please go back to Address and reserve again.",
      detail: { preReservationExpiresAtSec: preReservationExpiresAtSec ?? null, reservation_id: rid },
    };
  }

  if (Date.now() >= expMs - 1000) {
    throw {
      status: 409,
      code: "reservation_expired",
      error: "reservation_expired",
      message: "Your stock reservation has expired. Please go back to Address and reserve again.",
      detail: { reservation_id: rid, expires_at_ms: expMs },
    };
  }

  // ✅ 同步到本地 state/ref，供 UI 倒计时 & successMeta 使用
  if (reservationId !== rid) setReservationId(rid);
  if (reservationExpiresAt !== expMs) setReservationExpiresAt(expMs);
  reservationIdRef.current = rid;

  // ✅ 通过校验：返回 reservation id（PayPalBigButton 会把它带到 /orders）
  return rid;
}, [
  stockItems,
  cartHash,
  preReservationId,
  preReservationCartHash,
  preReservationExpiresAtSec,
  reservationId,
  reservationExpiresAt,
]);



  // ✅ NEW: countdown ticker for reservation (source of truth: preReservationExpiresAtSec)
useEffect(() => {
  if (!visible) {
    setReservationSecondsLeft(null);
    return;
  }

  const rid = String(preReservationId || "").trim();
  const expSec = Number(preReservationExpiresAtSec || 0);
  const expMs = Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : 0;

  if (!rid || !expMs) {
    setReservationSecondsLeft(null);
    return;
  }

  let timer: any = null;

  const tick = () => {
    const msLeft = expMs - Date.now();
    const secLeft = Math.max(0, Math.ceil(msLeft / 1000));

    setReservationSecondsLeft(secLeft);

    if (secLeft <= 0) {
      // 过期：清理本地展示状态 + 弹出 expired 错误
      setReservationId(null);
      setReservationExpiresAt(null);
      reservationIdRef.current = null;

      setPayError({
        type: "reservation_expired",
        status: 409,
        message: "Your stock reservation has expired. Please go back to Address and reserve again.",
        detail: { reservation_id: rid },
      });
    }
  };

  tick();
  timer = setInterval(tick, 1000);

  return () => {
    if (timer) clearInterval(timer);
  };
}, [visible, preReservationId, preReservationExpiresAtSec]);

  // ✅ successMeta: always include the freshest reservation id
  const successMetaWithReservation = useMemo(() => {
  const rid = String(preReservationId || "").trim() || null;

  return {
    checkoutTotals: checkoutTotalsMeta,
    address,
    deliveryOption: deliveryMethod,
    meta: {
      pricing_source: "paymentstep-derived",
    },
    reservation_id: rid,
    reservationId: rid,
    inventory_reservation_id: rid,
  };
}, [checkoutTotalsMeta, address, deliveryMethod, preReservationId]);


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
                    {typeof outOfStockDisplay?.current === "number" ? outOfStockDisplay.current : "0"}
                    {"  "}
                    <span className="mx-1">|</span>
                    <b>You selected:</b>{" "}
                    {typeof outOfStockDisplay?.requested === "number" ? outOfStockDisplay.requested : "0"}
                  </div>

                  <div className="mt-2">
                    Please adjust the quantity or remove the item in your bag, then try paying again.
                  </div>
                </div>
              )}

              {/* ---------- Reservation expired ---------- */}
              {payError.type === "reservation_expired" && (
                <div className="mt-2 text-xs leading-5">
                  <div>Your reserved items are no longer held.</div>
                  <div className="mt-1">
                    Please try paying again before the stock is taken by someone else.
                  </div>
                </div>
              )}

              {/* ---------- Reservation failed / conflict ---------- */}
              {payError.type === "reservation_failed" && (
                <div className="mt-2 text-xs leading-5">
                  <div>
                    We couldn’t confirm your reserved stock.
                  </div>
                  <div className="mt-1">
                    This can happen if your bag changed, the reservation was released,
                    or the payment was retried.
                  </div>
                  <div className="mt-1">
                    Tip: refresh the page and try again.
                  </div>
                </div>
              )}

              {/* ---------- Amount mismatch ---------- */}
              {payError.type === "amount_mismatch" && (
                <div className="mt-2 text-xs leading-5">
                  <div>The order total changed during checkout.</div>
                  <div className="mt-1">
                    Please refresh the page and check out again.
                  </div>
                </div>
              )}

              {/* ---------- Server error ---------- */}
              {payError.type === "server_error" && (
                <div className="mt-2 text-xs leading-5">
                  <div>We encountered a temporary issue.</div>
                  <div className="mt-1">
                    Please try again in a moment.
                  </div>
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
                      <div>{[address.city, address.state, address.postcode].filter(Boolean).join(" ")}</div>
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

                {visible && reservationId && (
                  <Alert variant="info" className="mt-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base">🛍️</span>
                      <div className="leading-5 flex-1">
                        <div className="font-medium flex items-center justify-between gap-3">
                          <span>Your items are reserved.</span>

                          {typeof reservationSecondsLeft === "number" ? (
                            <span className="text-xs font-semibold tabular-nums rounded-md border bg-white px-2 py-0.5">
                              {String(Math.floor(reservationSecondsLeft / 60)).padStart(2, "0")}:
                              {String(reservationSecondsLeft % 60).padStart(2, "0")}
                            </span>
                          ) : (
                            <span className="text-xs opacity-70">--:--</span>
                          )}
                        </div>

                        <div className="text-xs opacity-90">
                          Please complete your payment before the reservation expires.
                        </div>
                      </div>
                    </div>
                  </Alert>
                )}
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
                    ) : preReserveLoading ? (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-full px-6 py-3 text-sm font-semibold bg-[#FFC439] text-[#111827] opacity-70 cursor-not-allowed"
                      >
                        Preparing PayPal...
                      </button>
                    ) : (
                      <PayPalBigButton
                        amount={derivedAmountMajor}
                        currency={safeCurrency}
                        successMeta={successMetaWithReservation}
                        preflight={runStockReservePreflight}
                        preflightItems={stockItems}
                        onInitiate={() => {
                          console.log("[payment] initiating paypal with reservationId =", reservationIdRef.current);
                          setPayError(null);
                          setSuppressBlockedHint(true);
                          onPayInitiated();
                        }}
                        onSucceeded={(paypalPayload) => {
                          handlePaySucceeded(paypalPayload);
                        }}
                        onFailed={(err: any) => {
                          void handlePayFailed(err);
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
