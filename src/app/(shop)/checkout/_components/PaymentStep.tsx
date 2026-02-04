// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PaymentStep.tsx
"use client";

import React, { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Check, AlertCircle } from "lucide-react";
import PayPalBigButton from "./PayPalBigButton";
import { countryLabelOf } from "@/lib/country";

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

type PaymentStepProps = {
  visible: boolean;

  amountInMajorUnit: number; // legacy, 不当权威

  isPayProcessing: boolean;
  address: Address;

  itemsCount: number;
  itemsMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;

  onPayInitiated: () => void;
  onPaySucceeded: (payload?: any) => void;

  cart: Array<{
    price?: number; // major（折后价，如 84.15）
    qty?: number;
    currency?: string;

    // 你的 item 里还有很多字段（basePrice、sku、title...），这里不限制
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

const PaymentStep: React.FC<PaymentStepProps> = ({
  visible,
  amountInMajorUnit, // legacy
  isPayProcessing,
  address,
  itemsCount,
  itemsMinor,
  deliveryFeeMinor,
  totalMinor,
  currency,
  onPayInitiated,
  onPaySucceeded,
  cart,
}) => {
  const [method, setMethod] = useState<"card" | "paypal">("paypal");
  const [suppressBlockedHint, setSuppressBlockedHint] = useState(false);

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

      // ✅ 注意：这里用的是 it.price（折后价），不要用 basePrice
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

  // ✅ 统一的支付成功处理：原样把 payload 交给父组件
  const handlePaySucceeded = useCallback(
    (payload: any) => {
      console.log("[checkout] handlePaySucceeded payload", payload);
      setSuppressBlockedHint(true);
      onPaySucceeded(payload);
    },
    [onPaySucceeded]
  );

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
  }, [
    visible,
    isPayProcessing,
    suppressBlockedHint,
    derivedItemsCount,
    hasAddress,
    derivedTotalMinor,
  ]);

  const countryDisplay = useMemo(() => {
    const raw = (address?.country || "").trim();
    if (!raw) return "";
    const label = countryLabelOf(raw);
    return label || raw;
  }, [address?.country]);

  // ✅ NEW: 生成一个“权威 checkoutTotals + cart snapshot(minor)”——支付成功后给父组件用
  const checkoutTotalsMeta = useMemo(() => {
    const itemsSnapshot = (Array.isArray(cart) ? cart : []).map((it) => {
      const qty = Math.max(1, Number(it?.qty) || 1);
      const unitMinor = Math.round((Number(it?.price) || 0) * 100); // 折后价
      const lineMinor = unitMinor * qty;

      return {
        ...it,
        qty,
        unit_price_minor: unitMinor,
        line_total_minor: lineMinor,
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
  }, [
    cart,
    safeCurrency,
    derivedItemsCount,
    derivedItemsMinor,
    deliveryFeeMinor,
    derivedTotalMinor,
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
          <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Step 4
          </div>
          <div className="text-base font-semibold text-neutral-900">
            Payment Options
          </div>
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
            <div className="text-xs text-blue-900">
              You can go back to the Address step to make changes.
            </div>
          </div>
        </div>

        {visible && payBlockedReason && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>{payBlockedReason}</div>
          </div>
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
                    method === "paypal"
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-300 hover:bg-neutral-50",
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
                        {[address.city, address.state, address.postcode]
                          .filter(Boolean)
                          .join(" ")}
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
                  <div className="text-base font-medium">
                    {fmtMoneyMinor(derivedItemsMinor, safeCurrency)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Delivery</div>
                  <div className="text-base font-medium">
                    {Number(deliveryFeeMinor) === 0
                      ? "FREE"
                      : fmtMoneyMinor(Number(deliveryFeeMinor) || 0, safeCurrency)}
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Total</div>
                  <div className="text-xl font-bold">
                    {fmtMoneyMinor(derivedTotalMinor, safeCurrency)}
                  </div>
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
                        }}
                        onInitiate={() => {
                          setSuppressBlockedHint(true);
                          onPayInitiated();
                        }}
                        onSucceeded={(paypalPayload) => {
                          // ✅ 关键：不要重建/丢字段，直接把 PayPalBigButton 的 payload 原样交给父组件
                          // 其中 paypalPayload.successMeta.checkoutTotals 就是权威 totals
                          handlePaySucceeded(paypalPayload);
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
            All charges are processed in <b>{safeCurrency}</b>. Your bank or PayPal may apply currency
            conversion and fees.
          </p>
          <p>* Pay in 4 availability is determined by PayPal and may vary by account and region.</p>
        </div>
      </div>
    </section>
  );
};

export default PaymentStep;
