// src/app/checkout/_components/PaymentStep.tsx
"use client";

import React from "react";
import { Check } from "lucide-react";
import BraintreePayPalOnly from "@/app/checkout/_components/BraintreePayPalOnly";

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
  /** 当前是否处于 payment 步骤，用来决定显示 / 隐藏，但组件始终挂载 */
  visible: boolean;

  /** 订单总金额（单位：Major，例如 123.45 就传 123.45） */
  amountInMajorUnit: number;

  /** 是否正在处理支付（onApprove → handlePaySucceeded 跑的那段） */
  isPayProcessing: boolean;

  /** 收货地址（用于 Delivery Details 摘要） */
  address: Address;

  /** 购物车里商品数量 */
  itemsCount: number;

  /** 商品小计（minor 单位） */
  itemsMinor: number;

  /** 运费（minor 单位） */
  deliveryFeeMinor: number;

  /** 总价（minor 单位） */
  totalMinor: number;

  /** 货币代码，例如 "AUD" */
  currency: string;

  /** 用户点击 PayPal 按钮开始支付时触发 */
  onPayInitiated: () => void;

  /** 支付成功时回调（把 Braintree/PayPal 返回的 payload 往上抛） */
  onPaySucceeded: (payload?: any) => void;
};

/* ========== 金额格式化小工具（只在这个组件内部用） ========== */
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
  return (
    <section
      className="rounded-xl border"
      aria-hidden={!visible}
      style={
        visible
          ? undefined
          : {
              // ⚠️ 和原来一样：不在当前 step 时仍然挂载，只是挪到屏幕外并禁用交互
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
        {/* Payment Options（只显示 PayPal） */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">Payment Options</h2>
          <label className="flex items-center gap-3 w-full border rounded-md px-3 py-3 cursor-pointer border-black ring-1 ring-black">
            <input type="radio" name="payment" className="mt-0.5" checked readOnly />
            <div className="flex-1 flex items-center justify-between gap-3">
              <div className="font-medium">PayPal</div>
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

        {/* Delivery Details（摘要） */}
        <div className="border rounded-lg p-4">
          <h3 className="text-base font-medium mb-3">Delivery Details</h3>
          {address?.firstName || address?.lastName ? (
            <div className="text-sm leading-6 text-gray-800">
              <div>
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
              <div>{address.country}</div>
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
              {fmtMoneyMinor(itemsMinor, currency)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Delivery</div>
            <div className="text-base font-medium">
              {deliveryFeeMinor === 0
                ? "FREE"
                : fmtMoneyMinor(deliveryFeeMinor, currency)}
            </div>
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <div className="text-lg font-semibold">Total</div>
            <div className="text-xl font-bold">
              {fmtMoneyMinor(totalMinor, currency)}
            </div>
          </div>
        </div>

        {/* PayPal 按钮 */}
        <div className="p-4">
          <div className="mx-auto w-[300px]">
            {!visible ? null : (
              // 1) 金额为 0 且没有在处理支付：提示“不能付”
              amountInMajorUnit <= 0 && !isPayProcessing ? (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 text-center">
                  Your total is $0. Add items to proceed with payment.
                </div>
              ) : // 2) 正在处理支付（onApprove -> 你自己的 handlePaySucceeded 正在跑）
              isPayProcessing ? (
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
                // 3) 正常渲染 PayPal 按钮
                <BraintreePayPalOnly
                  amount={amountInMajorUnit}
                  currency="AUD"
                  onInitiate={onPayInitiated}
                  onSucceeded={(r) => onPaySucceeded(r)}
                />
              )
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          All charges are processed in <b>AUD</b>. Your bank or PayPal may
          apply currency conversion and fees.
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
