// src/app/checkout/_components/BagStep.tsx
"use client";

import React from "react";
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";
import BraintreePayPalOnly from "./BraintreePayPalOnly";
type CartItem = CartListItem;

interface BagStepProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;

  // 价格相关
  currency: string;          // 比如 "AUD"
  itemsMajor: number;        // 小计（以元为单位）
  savedMajor: number;        // 省下的钱（元）
  hasItems: boolean;

  // 运费策略
  deliveryThreshold: number; // 满多少免邮
  deliveryFlat: number;      // 未满时运费（元）

  // 用于隐藏的 PayPal 预加载
  amountInMajorUnit: number; // 总金额（PayPal 按钮的 amount）
}

/* 和原来 page.tsx 里的 fmtPrice 一样 */
function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

/* 原来底部的 Row 小组件搬过来用 */
function Row({
  label,
  value,
  strongLeft,
  strongRight,
  bigRight,
  valueClass,
}: {
  label: string;
  value: string;
  strongLeft?: boolean;
  strongRight?: boolean;
  bigRight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className={strongLeft ? "font-semibold" : "text-neutral-600"}>
        {label}
      </div>
      <div
        className={[
          strongRight ? "font-semibold" : "",
          bigRight ? "text-lg" : "text-base",
          valueClass || "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

const BagStep: React.FC<BagStepProps> = ({
  cart,
  setCart,
  currency,
  itemsMajor,
  savedMajor,
  hasItems,
  deliveryThreshold,
  deliveryFlat,
  amountInMajorUnit,
}) => {
  // 运费 & 总价（单位：元）
  const deliveryFeeMajor =
    hasItems && itemsMajor < deliveryThreshold ? deliveryFlat : 0;
  const totalMajor = itemsMajor + deliveryFeeMajor;

  return (
    <>
      {/* 主体：Your Bag + Order Summary */}
      <section className="rounded-xl border">
        <div className="border-b px-4 py-3 font-semibold">Your Bag</div>

        <div className="p-4">
          <CartList
            cart={cart}
            onInc={(k) =>
              setCart((p) =>
                p.map((x) =>
                  x.key === k
                    ? { ...x, qty: Math.min(x.qty + 1, x.stock) }
                    : x
                )
              )
            }
            onDec={(k) =>
              setCart((p) =>
                p.map((x) =>
                  x.key === k
                    ? { ...x, qty: Math.max(1, x.qty - 1) }
                    : x
                )
              )
            }
            onRemove={(k) => setCart((p) => p.filter((x) => x.key !== k))}
          />
        </div>

        <div className="border-t p-4">
          <div className="mb-2 text-sm font-semibold">Order Summary</div>
          <div className="space-y-2 text-sm">
            <Row
              label="Subtotal"
              value={fmtPrice(itemsMajor, currency)}
              strongRight
            />

            {savedMajor > 0 && (
              <Row
                label="You saved"
                value={fmtPrice(savedMajor, currency)}
                valueClass="text-emerald-700 font-semibold"
              />
            )}

            {hasItems && (
              <Row
                label="Delivery fee"
                value={
                  itemsMajor >= deliveryThreshold
                    ? "FREE for over $100"
                    : fmtPrice(deliveryFlat, currency)
                }
                valueClass={
                  itemsMajor >= deliveryThreshold
                    ? "text-emerald-700 font-semibold"
                    : undefined
                }
              />
            )}

            <div className="pt-1">
              <Row
                label="Total"
                value={fmtPrice(totalMajor, currency)}
                strongLeft
                strongRight
                bigRight
              />
              <div className="mt-1 text-xs text-neutral-500">
                Including GST
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 隐藏的 PayPal 预加载（原来 step === "bag" && amountInMajorUnit > 0 那块） */}
      {amountInMajorUnit > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <BraintreePayPalOnly
            amount={amountInMajorUnit}
            currency="AUD" // 你现在就是固定 AUD
            onInitiate={() => {}}
            onSucceeded={() => {}}
          />
        </div>
      )}
    </>
  );
};

export default BagStep;
