// src/components/nav/BagDrawer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBag } from "@/components/bag/BagProvider";
import CartList from "@/components/cart/CartList";

const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

// ===== 小工具 =====
function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * 支持三种方式决定“上浮距离”：
 * 1) CSS 变量：:root { --bag-checkout-offset: 140px; }
 * 2) 默认值 DEFAULT_OFFSET_PX
 * 3) 安全区：自动叠加 env(safe-area-inset-bottom)
 */
const DEFAULT_OFFSET_PX = 120;     // ← 把按钮往上提多少（px），想更高就调大
const FOOTER_HEIGHT_PX = 160;      // 估算底部区域高度，用于给列表留出 paddingBottom

export default function BagDrawer({ ownerId }: { ownerId: string }) {
  const { open, closeBag, cart, removeItem, inc, dec } = useBag();
  const router = useRouter();
  const asideRef = useRef<HTMLElement | null>(null);

  // 允许用 CSS 变量微调上浮距离
  const [offset, setOffset] = useState<number>(DEFAULT_OFFSET_PX);
  useEffect(() => {
    try {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--bag-checkout-offset")
        .trim();
      if (v) {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n)) setOffset(n);
      }
    } catch {}
  }, []);

  // 给当前抽屉打 owner 标记，便于 Provider 做清理
  useEffect(() => {
    if (asideRef.current) {
      asideRef.current.setAttribute("data-bag-owner", ownerId);
    }
  }, [ownerId]);

  const currency = cart[0]?.currency ?? "USD";
  const hasItems = cart.length > 0;

  const subtotal = useMemo(
    () => cart.reduce((a, it) => a + it.price * it.qty, 0),
    [cart]
  );
  const saved = useMemo(
    () =>
      cart.reduce((a, it) => {
        const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
        const diff = Math.max(0, base - it.price);
        return a + diff * it.qty;
      }, 0),
    [cart]
  );

  const deliveryFee =
    hasItems && subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const total = hasItems ? subtotal + deliveryFee : 0;

  const toCheckout = () => {
    closeBag();
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
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="relative flex h-full flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex-none flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Your Bag</div>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-neutral-100"
            onClick={closeBag}
            aria-label="Close bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 列表：根据“上浮距离+footer高度”为滚动内容留出空间 */}
        <div
          className="flex-1 overflow-y-auto p-4"
          style={{ paddingBottom: FOOTER_HEIGHT_PX + offset }}
        >
          <CartList cart={cart} onInc={inc} onDec={dec} onRemove={removeItem} />
        </div>

        {/* 底部合计（absolute + 上浮） */}
        <div
          data-testid="bag-footer"
          className="left-0 right-0 border-t bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // 自动叠加安全区（iOS 刘海屏），并整体上移 offset
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${offset}px)`,
            zIndex: 100,
          }}
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Subtotal</div>
            <div className="text-base font-semibold">{fmt(subtotal, currency)}</div>
          </div>

          {saved > 0 && (
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm text-neutral-600">You saved</div>
              <div className="text-sm font-semibold text-emerald-700">
                {fmt(saved, currency)}
              </div>
            </div>
          )}

          {hasItems && (
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm text-neutral-600">Delivery fee</div>
              <div
                className={[
                  "text-base font-semibold",
                  subtotal >= DELIVERY_FREE_THRESHOLD ? "text-emerald-700" : "",
                ].join(" ")}
              >
                {subtotal >= DELIVERY_FREE_THRESHOLD
                  ? "FREE for over $100"
                  : fmt(DELIVERY_FLAT, currency)}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Total</div>
            <div className="text-lg font-bold">{fmt(total, currency)}</div>
          </div>

          <button
            type="button"
            disabled={!hasItems}
            onClick={toCheckout}
            aria-label="Check out"
            className={[
              "w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold",
              !hasItems
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-900 text-white hover:bg-neutral-800",
            ].join(" ")}
          >
            Check out <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
