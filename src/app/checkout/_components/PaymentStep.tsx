// src/app/checkout/_components/PaymentStep.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Check } from "lucide-react";
import BraintreeDropIn from "@/app/checkout/_components/BraintreeDropIn";

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

  const safeCurrency = (currency || "AUD").toUpperCase();

  // ✅ 用 useCallback 固定回调引用，避免无限 render 循环
  const handleExposePay = useCallback((pay: () => void) => {
    console.log("[PaymentStep] onExposePay called, got pay function:", pay);
    setPayFn(() => pay);
  }, []);

  const handleCanPayChange = useCallback((can: boolean) => {
    console.log("[PaymentStep] onCanPayChange:", can);
    setCanPay(can);
  }, []);

  const handleClickPay = () => {
    if (!payFn) {
      console.log("[PaymentStep] handleClickPay but payFn is null");
      return;
    }
    onPayInitiated();
    console.log("[PaymentStep] calling payFn()…");
    payFn();
  };

  return (
    <section
      className="rounded-xl border"
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
      <div className="px-4 py-3 border-b font-semibold">
        How would you like to pay?
      </div>

      <div className="p-4 space-y-6">
        {/* Payment Options */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">Payment Options</h2>
          <label className="flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer border-black ring-1 ring-black">
            <input type="radio" name="payment" className="mt-0.5" checked readOnly />
            <div className="flex-1 flex items-center justify-between gap-3">
              <div className="font-medium">Card or PayPal</div>
              <div className="flex items-center gap-2 opacity-80">
                <img
                  src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                  alt="PayPal"
                  className="h-5"
                />
              </div>
            </div>
          </label>
        </div>

        {/* 蓝色提示 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
              <Check size={14} />
            </span>
            <div>
              <div className="font-medium">
                Make sure your delivery address is correct!
              </div>
              <div className="text-gray-600">
                You can go back to the Address step to make changes.
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="border rounded-lg p-4">
          <h3 className="text-base font-medium mb-3">Delivery Details</h3>
          {address?.firstName || address?.lastName ? (
            <div className="text-sm leading-6 text-gray-800">
              <div>
                {[address.firstName, address.lastName].filter(Boolean).join(" ")}
              </div>
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
              No delivery address found. Please complete the <b>Address</b>{" "}
              step.
            </div>
          )}
        </div>

        {/* 订单摘要 */}
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

        {/* 支付区域：Braintree Drop-in + 自定义 Pay 按钮 */}
        <div className="p-4">
          <div className="mx-auto w-[300px]">
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
              <div className="space-y-3">
                <BraintreeDropIn
                  amount={amountInMajorUnit}
                  currency={safeCurrency}
                  enableCard={true}
                  hideSubmitButton={true}
                  onExposePay={handleExposePay}
                  onCanPayChange={handleCanPayChange}
                  onSucceeded={(r) => {
                    console.log(
                      "[PaymentStep] Braintree onSucceeded raw data:",
                      r
                    );

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

                    console.log("[PaymentStep] normalized payload:", payload);
                    onPaySucceeded(payload);
                  }}
                />

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
            )}
          </div>
        </div>

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
