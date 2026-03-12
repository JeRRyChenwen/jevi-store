// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  buildCartHash,
  buildStockItems,
  fmtMoneyMinor,
  pickCreatedOrderIdFromPayPalPayload,
  type PayError,
  type StockCheckItem,
} from "./PaymentStep.helpers";
import type {
  Address,
  DeliveryMethod,
  PaymentStepProps,
} from "./PaymentStep.types";
import {
  getOutOfStockDisplay,
  mapPayFailure,
} from "./PaymentStep.error-utils";
import PaymentStepStatusAlerts from "./PaymentStepStatusAlerts";
import PaymentStepSummaryPanel from "./PaymentStepSummaryPanel";
import PaymentStepPayAction from "./PaymentStepPayAction";
import { usePaymentReservationState } from "./usePaymentReservationState";
import { countryLabelOf } from "@/lib/country";
import { mediaUrl } from "@/lib/strapi";


const PaymentStep: React.FC<PaymentStepProps> = ({
  visible,
  amountInMajorUnit, // legacy
  isPayProcessing,
  isLoggedIn,
  accountEmail,
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

  // ✅ 当前订单实际使用的邮箱
  // - 登录用户：优先账户邮箱
  // - 游客：使用地址表单里的 email
  const effectiveOrderEmail = useMemo(() => {
    return isLoggedIn
      ? String(accountEmail || "").trim()
      : String(address?.email || "").trim();
  }, [isLoggedIn, accountEmail, address?.email]);

  const {
    reservationSecondsLeft,
    reservationExpired,
    payBlockedReason,
  } = usePaymentReservationState({
    visible,
    isPayProcessing,
    suppressBlockedHint,
    payError,

    derivedItemsCount,
    hasAddress: !!hasAddress,
    effectiveOrderEmail,
    isLoggedIn,

    preReserveLoading,
    preReserveError,

    preReservationId,
    preReservationCartHash,
    preReservationExpiresAtSec,

    cartHash,
    derivedTotalMinor,
  });

  // ✅ NEW: PayPal 按钮是否应变成 unavailable（灰掉）
  const paypalUnavailable = useMemo(() => {
    if (!visible) return true;

    // 正在处理支付时，也应该不可点
    if (isPayProcessing) return true;

    // reserve 正在跑：保持不可点（你已有 Preparing PayPal... 分支，这里也防止 PayPalButtons 被渲染）
    if (preReserveLoading) return true;

    // 没有 address / bag 空 / totals 异常 等阻断原因：不可点
    if (payBlockedReason) return true;

    // ✅ 关键：只要出现这些错误，就直接禁用 PayPal（你要的两种情况）
    if (payError?.type === "out_of_stock") return true;
    if (payError?.type === "reservation_expired") return true;
    if (payError?.type === "reservation_failed") return true;

    // 你也可以把 amount_mismatch / server_error 一起禁用（更合理）
    if (payError?.type === "amount_mismatch") return true;
    if (payError?.type === "server_error") return true;

    return false;
  }, [
    visible,
    isPayProcessing,
    preReserveLoading,
    payBlockedReason,
    payError,
  ]);

  const countryDisplay = useMemo(() => {
    const raw = (address?.country || "").trim();
    if (!raw) return "";
    const label = countryLabelOf(raw);
    return label || raw;
  }, [address?.country]);

  /**
   * ✅ 缺货展示信息：优先从 cart snapshot 取；找不到再用后端 detail
   * 已抽到独立 helper，避免 PaymentStep.tsx 继续膨胀
   */
  const outOfStockDisplay = useMemo(() => {
    return getOutOfStockDisplay(payError, cart);
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
      reservationIdRef.current = null;

      // ✅ 关键：支付成功后，直接跳转到 confirmation（只出现 Finalizing）
      const orderId = pickCreatedOrderIdFromPayPalPayload(payload);

      if (orderId) {
        router.replace(`/order/confirmation?orderId=${orderId}`);
        return;
      }

      // 拿不到 orderId 也至少跳过去（会停在 Finalizing）
      router.replace(`/order/confirmation`);
    },
    [router]
  );

  /**
   * ✅ 把错误码 -> UI 文案映射抽到独立 util
   * 这样 PaymentStep.tsx 只保留“接收错误并写入 state”
   */
  const handlePayFailed = useCallback(async (err: any) => {
    setPayError(mapPayFailure(err));
  }, []);

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



  // ✅ countdown 已抽到 usePaymentReservationState
  // 这里只负责：一旦确认过期，就清理本地 reservation 状态，并写入统一 payError
  useEffect(() => {
    if (!visible) return;
    if (!reservationExpired) return;

    const rid = String(preReservationId || "").trim();

    setReservationId(null);
    setReservationExpiresAt(null);
    reservationIdRef.current = null;

    setPayError((prev) => {
      if (prev?.type === "reservation_expired") return prev;

      return {
        type: "reservation_expired",
        status: 409,
        message: "Your stock reservation has expired. Please go back to Address and reserve again.",
        detail: { reservation_id: rid || null },
      };
    });
  }, [visible, reservationExpired, preReservationId]);

  // ✅ successMeta: always include the freshest reservation id
  // ✅ 并把“最终订单邮箱”一并传给 PayPalBigButton
  const successMetaWithReservation = useMemo(() => {
    const rid = String(preReservationId || "").trim() || null;

    return {
      checkoutTotals: checkoutTotalsMeta,

      // ✅ NEW: 给 PayPalBigButton /orders 使用的最终订单邮箱
      // 登录用户：通常是 accountEmail
      // 游客：通常是 address.email
      checkoutEmail: effectiveOrderEmail || null,

      // ✅ NEW: 额外保留账户邮箱，作为备用字段
      accountEmail: accountEmail || null,

      address,
      deliveryOption: deliveryMethod,
      meta: {
        pricing_source: "paymentstep-derived",
      },
      reservation_id: rid,
      reservationId: rid,
      inventory_reservation_id: rid,
    };
  }, [
    checkoutTotalsMeta,
    effectiveOrderEmail,
    accountEmail,
    address,
    deliveryMethod,
    preReservationId,
  ]);


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

        <PaymentStepStatusAlerts
          visible={visible}
          payError={payError}
          outOfStockDisplay={outOfStockDisplay}
          preReserveLoading={preReserveLoading}
          payBlockedReason={payBlockedReason}
        />

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

            <PaymentStepSummaryPanel
              address={address}
              hasAddress={!!hasAddress}
              countryDisplay={countryDisplay}
              effectiveOrderEmail={effectiveOrderEmail}
              derivedItemsCount={derivedItemsCount}
              derivedItemsMinor={derivedItemsMinor}
              deliveryFeeMinor={Number(deliveryFeeMinor) || 0}
              derivedTotalMinor={derivedTotalMinor}
              safeCurrency={safeCurrency}
              visible={visible}
              reservationId={reservationId}
              reservationSecondsLeft={reservationSecondsLeft}
              payError={payError}
              actionSlot={
                <PaymentStepPayAction
                  visible={visible}
                  derivedAmountMajor={derivedAmountMajor}
                  safeCurrency={safeCurrency}
                  isPayProcessing={isPayProcessing}
                  preReserveLoading={preReserveLoading}
                  paypalUnavailable={paypalUnavailable}
                  successMetaWithReservation={successMetaWithReservation}
                  stockItems={stockItems}
                  runStockReservePreflight={runStockReservePreflight}
                  reservationIdRef={reservationIdRef}
                  setPayError={setPayError}
                  setSuppressBlockedHint={setSuppressBlockedHint}
                  onPayInitiated={onPayInitiated}
                  handlePaySucceeded={handlePaySucceeded}
                  handlePayFailed={handlePayFailed}
                />
              }
            />
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-1 text-xs text-gray-500">
          <p>
            All charges are processed in <b>{safeCurrency}</b>. Your bank or PayPal may apply currency conversion and fees.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PaymentStep;
