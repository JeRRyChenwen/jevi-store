// src/app/checkout/_components/PaymentStep.tsx
"use client";

import React, { useState, useCallback, useMemo } from "react"; // ✅ NEW: useMemo
import Image from "next/image";
import { Check, AlertCircle } from "lucide-react";
// ✅ Card payment temporarily disabled (no processing permission / not needed now)
// import BraintreeHostedFields from "./BraintreeHostedFields";
import PayPalBigButton from "./PayPalBigButton";

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
  country?: string;
};

type PaymentStepProps = {
  visible: boolean;
  amountInMajorUnit: number;
  isPayProcessing: boolean;
  address: Address;
  itemsCount: number;
  itemsMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;
  onPayInitiated: () => void;
  onPaySucceeded: (payload?: any) => void;
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

/* ========== 组件本体 ========== */
const PaymentStep: React.FC<PaymentStepProps> = ({
  visible,
  amountInMajorUnit,
  isPayProcessing,
  address,
  itemsCount,
  itemsMinor,
  deliveryFeeMinor,
  totalMinor,
  currency,
  onPayInitiated,
  onPaySucceeded,
}) => {
  // ✅ Card payment currently disabled: keep states for future re-enable if needed
  const [payFn, setPayFn] = useState<(() => void) | null>(null);
  const [canPay, setCanPay] = useState(false);

  // ✅ IMPORTANT: default to PayPal (card hidden)
  const [method, setMethod] = useState<"card" | "paypal">("paypal");

  // ✅ NEW: 在用户点击支付后，屏蔽“bag empty”等阻止提示，
  // 用于解决：支付成功后 clearCart() 造成的瞬间红条闪现
  const [suppressBlockedHint, setSuppressBlockedHint] = useState(false);

  const safeCurrency = (currency || "AUD").toUpperCase();

  // 当前显示的支付方式（card）会通过这个回调把 pay() 暴露出来
  const handleExposePay = useCallback((pay: () => void) => {
    setPayFn(() => pay);
  }, []);

  const handleCanPayChange = useCallback((can: boolean) => {
    setCanPay(can);
  }, []);

  // ✅ 统一的支付成功处理：打 log + 调父组件
  const handlePaySucceeded = useCallback(
    (payload: any) => {
      console.log("[checkout] handlePaySucceeded payload", payload);

      // ✅ NEW: 一旦成功，就继续 suppress（直到页面跳转走）
      // 这样即便父组件 clearCart()，也不会在这页闪出 “Your bag is empty”
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

  // ✅ 行业常见：Payment step 再做一次 “能否支付” 防线，并给用户可见提示
  // ✅ NEW: 用 useMemo + 加 3 个护栏：
  // - 不可见时不提示（你原来已经做到了）
  // - 正在支付时不提示（避免流程中间状态闪烁）
  // - 用户已经点击过支付 / 已成功（suppressBlockedHint）时不提示
  const payBlockedReason = useMemo(() => {
    if (!visible) return null;

    // ✅ NEW: 这三个条件是解决你问题的关键
    if (isPayProcessing) return null;
    if (suppressBlockedHint) return null;

    if (itemsCount <= 0) {
      return "Your bag is empty. Please add at least one item before paying.";
    }
    if (!hasAddress) {
      return "No delivery address found. Please complete the Address step before paying.";
    }
    if (totalMinor <= 0) {
      return "Invalid total amount. Please review your order.";
    }
    return null;
  }, [visible, isPayProcessing, suppressBlockedHint, itemsCount, hasAddress, totalMinor]);

  const handleClickPay = () => {
    // ✅ 多一层防守：即使按钮状态没及时更新，也绝不触发支付
    if (payBlockedReason) return;

    if (!payFn || !visible || isPayProcessing) return; // 防止多次点击

    // ✅ NEW: 一旦用户发起支付，就屏蔽阻止提示（避免后续 clearCart 闪红条）
    setSuppressBlockedHint(true);

    // ✅ Card payment currently disabled; PayPal goes its own flow.
    if (method === "card") {
      // 如果未来恢复 card，这里逻辑依然可用
      onPayInitiated();
      payFn();
    }
  };

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
      {/* 头部 */}
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
        {/* 地址提醒 */}
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 flex gap-2">
          <span className="mt-0.5 text-base">ℹ️</span>
          <div>
            <div className="font-medium">
              Make sure your delivery address is correct!
            </div>
            <div className="text-xs text-blue-900">
              You can go back to the Address step to make changes.
            </div>
          </div>
        </div>

        {/* ✅ 若被阻止支付，给用户一个明确提示（只在 visible 时显示，避免预加载时干扰） */}
        {visible && payBlockedReason && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>{payBlockedReason}</div>
          </div>
        )}

        {/* ✅ 中间主体区域：占满中间高度 */}
        <div className="flex-1 flex flex-col">
          {/* 支付方式 + Delivery Details + Summary */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
            {/* 👉 左侧：Choose a way to pay + Card / PayPal 具体内容 */}
            <div className="border rounded-lg p-4 h-[460px] flex flex-col">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Choose a way to pay
                </h3>

                {/* ✅ Card payment temporarily disabled (hidden) */}
                {false && (
                  <button
                    type="button"
                    onClick={() => setMethod("card")}
                    className={[
                      "w-full flex items-center justify-between rounded-md border px-3 py-3 text-sm text-left",
                      method === "card"
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-300 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <span className="font-medium">Credit or Debit Card</span>

                    {/* 右侧：Visa / Mastercard 官方 logo（统一尺寸） */}
                    <div className="flex items-center gap-1">
                      {/* Visa */}
                      <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
                        <div className="relative h-6 w-14">
                          <Image
                            src="/cards/visa.svg"
                            alt="Visa"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </span>

                      {/* Mastercard */}
                      <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
                        <div className="relative h-6 w-14">
                          <Image
                            src="/cards/mastercard.svg"
                            alt="Mastercard"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </span>
                    </div>
                  </button>
                )}

                {/* PayPal */}
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

                  {/* 右侧：PayPal 官方 logo（统一为 h-6 w-14） */}
                  <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
                    <div className="relative h-6 w-14">
                      <Image
                        src="/cards/paypal.svg"
                        alt="PayPal"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </span>
                </button>
              </div>

              {/* Card / PayPal 具体内容：固定占用剩余高度 */}
              <div className="mt-5 border-t pt-4 flex-1 flex flex-col">
                {/* ✅ Card payment disabled: do not render hosted fields */}
                <div className="flex-1" />
              </div>
            </div>

            {/* 👉 右侧：Delivery + Summary（stacked） */}
            <div className="space-y-4">
              {/* Delivery Details */}
              <div className="border rounded-lg p-4">
                <h3 className="text-base font-medium mb-3">Delivery Details</h3>
                {hasAddress ? (
                  <div className="text-sm leading-6 text-gray-800 space-y-0.5">
                    <div>
                      {[address.firstName, address.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
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
                    {address.country && <div>{address.country}</div>}
                    {address.email && <div className="mt-2">{address.email}</div>}
                    {address.phone && <div>{address.phone}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No delivery address found. Please complete the{" "}
                    <b>Address</b> step.
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Items</div>
                  <div className="text-base font-medium">
                    {itemsCount} item{itemsCount > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Subtotal</div>
                  <div className="text-base font-medium">
                    {fmtMoneyMinor(itemsMinor, safeCurrency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Delivery</div>
                  <div className="text-base font-medium">
                    {deliveryFeeMinor === 0
                      ? "FREE"
                      : fmtMoneyMinor(deliveryFeeMinor, safeCurrency)}
                  </div>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <div className="text-lg font-semibold">Total</div>
                  <div className="text-xl font-bold">
                    {fmtMoneyMinor(totalMinor, safeCurrency)}
                  </div>
                </div>
              </div>

              {/* Pay now / Pay with PayPal */}
              {visible && amountInMajorUnit > 0 && (
                <div className="pt-0 flex justify-end">
                  <div className="w-[260px] max-w-full">
                    {/* ✅ Only keep PayPal branch */}
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
                        amount={amountInMajorUnit}
                        currency={safeCurrency}
                        onInitiate={() => {
                          setSuppressBlockedHint(true);
                          onPayInitiated();
                        }}
                        onSucceeded={(details) => {
                          setSuppressBlockedHint(true);

                          const d: any = details?.details ?? details ?? null;

                          // ✅ 核心：拿 capture_id（用于 /v2/payments/captures/{id}/refund）
                          const captureId =
                            d?.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
                            d?.purchase_units?.[0]?.payments?.captures?.[0]?.capture_id ??
                            null;

                          // ✅ 兜底：如果拿不到 captureId，就不要假装可退款
                          if (!captureId) {
                            console.warn("[paypal] missing capture id in details:", d);
                          }

                          onPaySucceeded({
                            provider: "paypal" as const,

                            // ✅ 不要用 paymentMethod 字段（你 page.tsx 会因为字段存在误判为 braintree）
                            // paymentMethod: "paypal" as const,

                            provider_txn_id: captureId, // ✅ 必须是 capture_id
                            payment_method: "paypal" as const, // ✅ 用这个字段更安全（你后端也有 payment_method 列）
                            cardBrand: null,
                            cardLast4: null,
                            raw: d,
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ 底部说明：真正作为 footer，贴在整张卡片底部 */}
        <div className="mt-auto pt-6 space-y-1 text-xs text-gray-500">
          <p>
            All charges are processed in <b>{safeCurrency}</b>. Your bank or
            PayPal may apply currency conversion and fees.
          </p>
          <p>
            * Pay in 4 availability is determined by PayPal and may vary by
            account and region.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PaymentStep;
