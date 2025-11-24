// src/app/checkout/_components/PaymentStep.tsx
"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import BraintreeDropIn from "@/app/checkout/_components/BraintreeDropIn";
import BraintreeHostedFields from "@/app/checkout/_components/BraintreeHostedFields";

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
  const [payFn, setPayFn] = useState<(() => void) | null>(null);
  const [canPay, setCanPay] = useState(false);
  const [method, setMethod] = useState<"card" | "paypal">("card");

  const safeCurrency = (currency || "AUD").toUpperCase();

  // 当前显示的方法（card 或 paypal）会通过这个回调把 pay() 暴露出来
  const handleExposePay = useCallback((pay: () => void) => {
    setPayFn(() => pay);
  }, []);

  const handleCanPayChange = useCallback((can: boolean) => {
    setCanPay(can);
  }, []);

  const handleClickPay = () => {
    if (!payFn || !visible) return;
    // PayPal 走外层 onPayInitiated；Card 在 HostedFields 内部已经调用 onInitiate
    if (method === "paypal") {
      onPayInitiated();
    }
    payFn();
  };

  const hasAddress =
    address?.firstName ||
    address?.lastName ||
    address?.line1 ||
    address?.city ||
    address?.state ||
    address?.postcode;

  return (
    <section
      className="rounded-xl border bg-white"
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

      <div className="p-4 space-y-4">
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

        {/* Delivery Details + Summary */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
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
                No delivery address found. Please complete the <b>Address</b>{" "}
                step.
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
        </div>

        {/* 支付方式 + 右侧内容 */}
        <div className="mt-2">
          {!visible ? null : amountInMajorUnit <= 0 && !isPayProcessing ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 text-center">
              Your total is $0. Add items to proceed with payment.
            </div>
          ) : isPayProcessing ? (
            <div
              className="
                flex h-[45px] items-center justify-center
                rounded-md border
                bg-[#FFC439] border-[#FFC439]
                text-sm font-semibold text-[#111111]
                shadow-sm
              "
            >
              Processing your payment…
            </div>
          ) : (
            // 固定高度区域
            <div
              className="
                border rounded-lg p-4
                lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6
                min-h-[340px]
              "
            >
              {/* 左边：选择方式 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Choose a way to pay
                </h3>

                {/* Card */}
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
                  <span className="font-medium">Card</span>

                  {/* 右侧：Visa / Mastercard 官方 logo（统一尺寸） */}
                  <div className="flex items-center gap-1">
                    {/* Visa */}
                    <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
                      <div className="relative h-6 w-14">
                        <Image
                          src="/cards/visa.svg"
                          alt="Visa"
                          fill
                          className="object-contain scale-100 origin-center"
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
                          className="object-contain scale-100 origin-center"
                        />
                      </div>
                    </span>
                  </div>
                </button>

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

                  {/* 右侧：PayPal 官方 logo（统一为 h-4 w-10） */}
                  <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
                    <div className="relative h-6 w-14">
                      <Image
                        src="/cards/paypal.svg"
                        alt="PayPal"
                        fill
                        className="object-contain scale-100 origin-center"
                      />
                    </div>
                  </span>
                </button>
              </div>

              {/* 右边：根据选择渲染具体内容 */}
              <div className="mt-4 lg:mt-0 h-full flex items-start">
                <div className="w-full">
                  {method === "card" ? (
                    <BraintreeHostedFields
                      amount={amountInMajorUnit}
                      currency={safeCurrency}
                      onInitiate={() => {
                        onPayInitiated();
                      }}
                      // ⭐ Card 也通过统一的 exposePay / canPay 接口暴露给外部
                      onExposePay={handleExposePay}
                      onCanPayChange={handleCanPayChange}
                      onSucceeded={(r) => {
                        const anyR = r as any;

                        const txId =
                          anyR?.transactionId ||
                          anyR?.id ||
                          null;

                        const payload = {
                          provider: "braintree" as const,
                          paymentMethod: (anyR?.paymentMethod || "card") as
                            | "card"
                            | "paypal",
                          provider_txn_id: txId,
                          cardBrand:
                            anyR?.cardBrand ??
                            anyR?.card_brand ??
                            null,
                          cardLast4:
                            anyR?.cardLast4 ??
                            anyR?.card_last4 ??
                            null,
                          raw: r,
                        };

                        onPaySucceeded(payload);
                      }}
                    />
                  ) : (
                    <BraintreeDropIn
                      amount={amountInMajorUnit}
                      currency={safeCurrency}
                      enableCard={false} // 只展示 PayPal
                      hideSubmitButton={true}
                      onExposePay={handleExposePay}
                      onCanPayChange={handleCanPayChange}
                      onSucceeded={(r) => {
                        const payload = {
                          provider: "braintree" as const,
                          paymentMethod:
                            (r as any).paymentMethod ||
                            (r as any).method ||
                            ((r as any).paypalAccount ? "paypal" : "card"),
                          cardBrand:
                            (r as any).cardBrand ||
                            (r as any).cardType ||
                            (r as any).card?.brand ||
                            (r as any).creditCard?.cardType ||
                            null,
                          cardLast4:
                            (r as any).cardLast4 ||
                            (r as any).last4 ||
                            (r as any).card?.last4 ||
                            (r as any).creditCard?.last4 ||
                            null,
                          provider_txn_id:
                            (r as any).id ||
                            (r as any).transactionId ||
                            (r as any).txnId ||
                            null,
                          raw: r,
                        };
                        onPaySucceeded(payload);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 统一的 Pay now 按钮：Card / PayPal 共用 */}
        {visible &&
          amountInMajorUnit > 0 &&
          !isPayProcessing && (
            <div className="pt-3 flex justify-end">
              <div className="w-[260px] max-w-full">
                <button
                  type="button"
                  disabled={!payFn || !canPay}
                  onClick={handleClickPay}
                  className={[
                    "w-full rounded-full px-6 py-3 text-sm font-semibold",
                    !payFn || !canPay
                      ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      : "bg-neutral-900 text-white hover:bg-neutral-800",
                  ].join(" ")}
                >
                  Pay now
                </button>
              </div>
            </div>
          )}

        {/* 底部说明 */}
        <p className="mt-2 text-xs text-gray-500">
          All charges are processed in <b>{safeCurrency}</b>. Your bank or
          PayPal may apply currency conversion and fees.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          * Pay in 4 availability is determined by PayPal and may vary by
          account and region.
        </p>
      </div>
    </section>
  );
};

export default PaymentStep;
