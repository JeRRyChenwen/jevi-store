// src/components/nav/BagDrawer.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBag } from "@/components/bag/BagProvider";
import CartList, { type CartItem as CartListItem } from "@/components/cart/CartList";

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

  // ✅ 总件数：用于手机端 header 辅助信息
  const itemCount = cartItems.reduce((sum, it) => sum + (it.qty ?? 0), 0);

  // ✅ Subtotal：仍然用 cartItems 里的 price * qty（你现在 price 已经是“最终价 major”，所以这里正确）
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (a: number, it: CartListItem) => a + (it.price ?? 0) * (it.qty ?? 0),
        0
      ),
    [cartItems]
  );

  // ✅ You saved：仍按 basePrice - price 来算（如果你 basePrice 是原价）
  const saved = useMemo(
    () =>
      cartItems.reduce((a: number, it: CartListItem) => {
        const base = typeof it.basePrice === "number" ? it.basePrice : it.price ?? 0;
        const diff = Math.max(0, base - (it.price ?? 0));
        return a + diff * (it.qty ?? 0);
      }, 0),
    [cartItems]
  );

  // ✅ 关键：BagDrawer 不显示 Delivery fee，并且 Total = Subtotal
  const total = hasItems ? subtotal : 0;

  const toCheckout = () => {
    closeFn();
    router.push("/checkout?step=bag");
  };

  return (
    <>
      {/* ✅ 背景遮罩：手机端抽屉体验会明显更自然；点遮罩可关闭 */}
      <button
        type="button"
        aria-label="Close bag overlay"
        onClick={closeFn}
        className={[
          "fixed inset-0 z-[9998] bg-black/30 transition-opacity",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        ref={asideRef}
        aria-label="Your bag"
        role="dialog"
        aria-modal="true"
        className={[
          // ✅ 手机端改为更接近全宽的抽屉；到 sm 再恢复固定宽度
          "fixed inset-y-0 right-0 z-[9999] w-full max-w-[420px] sm:w-[420px]",
          "bg-white shadow-xl transition-transform",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* 纵向布局：中部滚动 + 底部吸底 */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 border-b px-4 py-3 md:px-4 md:py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-6 md:text-base">
                  Your Bag
                </div>
                <div className="text-xs text-neutral-500">
                  {hasItems
                    ? `${itemCount} item${itemCount > 1 ? "s" : ""}`
                    : "Your bag is currently empty"}
                </div>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-full p-2.5 hover:bg-neutral-100"
                onClick={closeFn}
                aria-label="Close bag"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 中部：可滚动的列表（min-h-0 避免子元素撑爆） */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:p-4">
            <CartList cart={cartItems} onInc={inc} onDec={dec} onRemove={removeItem} />
          </div>

          {/* 底部：Subtotal / You saved / Total / Check out */}
          <footer
            className={[
              "sticky bottom-0 z-10 shrink-0 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              hasItems
                ? "p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
                : "p-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)]",
            ].join(" ")}
          >
            {hasItems ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="text-base font-semibold">{fmt(subtotal, currency)}</span>
                  </div>

                  {saved > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">You saved</span>
                      <span className="font-semibold text-emerald-700">{fmt(saved, currency)}</span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-2">
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
                    // ✅ 手机端按钮更高一点，更适合拇指点击
                    "mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold md:h-11",
                    "transition-colors",
                    !hasItems
                      ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                      : "bg-neutral-900 text-white hover:bg-neutral-800",
                  ].join(" ")}
                >
                  Check out <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-neutral-500">
                  Add something you love to continue to checkout.
                </div>

                <button
                  type="button"
                  disabled
                  aria-label="Check out"
                  className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-neutral-200 px-6 text-sm font-semibold text-neutral-500 md:h-11"
                >
                  Check out <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
}
