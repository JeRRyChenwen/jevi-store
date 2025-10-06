// src/components/nav/BagDrawer.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBag } from "@/components/bag/BagProvider";
import CartList, { type CartItem as CartListItem } from "@/components/cart/CartList";

const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

// 价格格式化
function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function BagDrawer({ ownerId = "global" }: { ownerId?: string }) {
  // 不做整体断言，防止与上下文类型冲突
  const bag = useBag() as any;

  // 兼容不同命名：close / closeBag
  const isOpen: boolean = !!bag?.open;
  const closeFn: () => void =
    typeof bag?.close === "function"
      ? bag.close
      : typeof bag?.closeBag === "function"
      ? bag.closeBag
      : () => {};

  const removeItem: (key: string) => void = bag?.removeItem;
  const inc: (key: string) => void = bag?.inc;
  const dec: (key: string) => void = bag?.dec;

  const cartItems: CartListItem[] = Array.isArray(bag?.cart) ? (bag.cart as CartListItem[]) : [];

  const router = useRouter();
  const asideRef = useRef<HTMLElement | null>(null);

  // 仅做标记（不再操作其它实例 DOM，避免与 React 卸载冲突）
  useEffect(() => {
    if (asideRef.current) {
      asideRef.current.setAttribute("data-bag-owner", ownerId);
    }
  }, [ownerId]);

  const currency = cartItems[0]?.currency ?? "AUD";
  const hasItems = cartItems.length > 0;

  const subtotal = useMemo(
    () => cartItems.reduce((a: number, it: CartListItem) => a + (it.price ?? 0) * (it.qty ?? 0), 0),
    [cartItems]
  );

  const saved = useMemo(
    () =>
      cartItems.reduce((a: number, it: CartListItem) => {
        const base = typeof it.basePrice === "number" ? it.basePrice : (it.price ?? 0);
        const diff = Math.max(0, base - (it.price ?? 0));
        return a + diff * (it.qty ?? 0);
      }, 0),
    [cartItems]
  );

  const deliveryFee =
    hasItems && subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const total = hasItems ? subtotal + deliveryFee : 0;

  const toCheckout = () => {
    closeFn();
    router.push("/checkout?step=bag");
  };

  return (
    <aside
      ref={asideRef}
      aria-label="Your bag"
      role="dialog"
      aria-modal="true"
      className={[
        "fixed inset-y-0 right-0 z-[9999] w-[360px] sm:w-[420px]",
        "bg-white shadow-xl transition-transform",
        isOpen ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      {/* 纵向布局：中部滚动 + 底部吸底 */}
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Your Bag</div>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-neutral-100"
            onClick={closeFn}
            aria-label="Close bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 中部：可滚动的列表（min-h-0 避免子元素撑爆） */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <CartList cart={cartItems} onInc={inc} onDec={dec} onRemove={removeItem} />
        </div>

        {/* 底部：Subtotal / You saved / Delivery fee / Total / Check out */}
        <footer className="sticky bottom-0 z-10 shrink-0 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span className="text-base font-semibold">{fmt(subtotal, currency)}</span>
            </div>

            {saved > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">You saved</span>
                <span className="font-semibold text-emerald-700">
                  {fmt(saved, currency)}
                </span>
              </div>
            )}

            {hasItems && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Delivery fee</span>
                <span
                  className={[
                    "text-base font-semibold",
                    subtotal >= DELIVERY_FREE_THRESHOLD ? "text-emerald-700" : "",
                  ].join(" ")}
                >
                  {subtotal >= DELIVERY_FREE_THRESHOLD
                    ? "FREE for over $100"
                    : fmt(DELIVERY_FLAT, currency)}
                </span>
              </div>
            )}

            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold">{fmt(total, currency)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!hasItems}
            onClick={toCheckout}
            aria-label="Check out"
            className={[
              "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold",
              !hasItems
                ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                : "bg-neutral-900 text-white hover:bg-neutral-800",
            ].join(" ")}
          >
            Check out <ChevronRight className="h-4 w-4" />
          </button>
        </footer>
      </div>
    </aside>
  );
}
