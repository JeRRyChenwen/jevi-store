// src/app/checkout/_components/BagStep.tsx
"use client";

import React from "react";
import Link from "next/link";
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";
import BraintreePayPalOnly from "./BraintreePayPalOnly";

// ✅ 统一提示体系
import { Alert } from "@/components/ui/alert";

type CartItem = CartListItem;

interface BagStepProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;

  // 价格相关
  currency: string; // 比如 "AUD"
  itemsMajor: number; // 小计（以元为单位）
  savedMajor: number; // 省下的钱（元）
  hasItems: boolean;

  // 运费策略（先保留 props，不用也没关系）
  deliveryThreshold: number;
  deliveryFlat: number;

  // 用于隐藏的 PayPal 预加载
  amountInMajorUnit: number;
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
  amountInMajorUnit,
}) => {
  const isEmpty = (cart?.length || 0) === 0;

  // ✅ 这里的 Total 先按“不含运费”展示，避免误导
  const totalExclDeliveryMajor = itemsMajor;

  return (
    <>
      <section className="rounded-xl border">
        <div className="border-b px-4 py-3 font-semibold">Your Bag</div>

        <div className="p-4 space-y-3">
          {isEmpty && (
            <Alert variant="info">
              <div className="flex flex-col gap-2">
                <div className="font-medium">Your bag is empty.</div>
                <div className="text-sm">
                  Please add at least one item before continuing checkout.
                </div>
                <div>
                  <Link href="/" className="underline text-sm">
                    Continue shopping
                  </Link>
                </div>
              </div>
            </Alert>
          )}

          <CartList
            cart={cart}
            onInc={(k) =>
              setCart((p) =>
                p.map((x) =>
                  x.key === k ? { ...x, qty: Math.min(x.qty + 1, x.stock) } : x
                )
              )
            }
            onDec={(k) =>
              setCart((p) =>
                p.map((x) =>
                  x.key === k ? { ...x, qty: Math.max(1, x.qty - 1) } : x
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

            {/* ✅ 不展示 delivery fee（地址未填完时不误导） */}

            <div className="pt-1">
              <Row
                label="Total (excl. delivery)"
                value={fmtPrice(totalExclDeliveryMajor, currency)}
                strongLeft
                strongRight
                bigRight
              />
              <div className="mt-1 text-xs text-neutral-500">
                Delivery fee may apply after you enter the delivery address and choose a delivery option.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 隐藏的 PayPal 预加载（保留） */}
      {amountInMajorUnit > 0 && !isEmpty && hasItems && (
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
            currency="AUD"
            onInitiate={() => {}}
            onSucceeded={() => {}}
          />
        </div>
      )}
    </>
  );
};

export default BagStep;
