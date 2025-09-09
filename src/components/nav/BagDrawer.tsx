// src/components/nav/BagDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

// 复用通用购物车列表组件
import CartList from "@/components/cart/CartList";
import type { CartItem as CartListItem } from "@/components/cart/CartList";

type CartItem = CartListItem;

const LS_KEY = "bag:v1";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCart(list: CartItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
  // 通知其它页面/组件刷新
  try {
    window.dispatchEvent(new Event("bag:updated"));
  } catch {}
}

export default function BagDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setCart(readCart());

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === LS_KEY) setCart(readCart());
    };
    const openHandler = () => setOpen(true);
    const toggleHandler = () => setOpen((v) => !v);
    const refresh = () => setCart(readCart());

    window.addEventListener("storage", onStorage);
    window.addEventListener("bag:open", openHandler as EventListener);
    window.addEventListener("bag:toggle", toggleHandler as EventListener);
    window.addEventListener("bag:updated", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bag:open", openHandler as EventListener);
      window.removeEventListener("bag:toggle", toggleHandler as EventListener);
      window.removeEventListener("bag:updated", refresh as EventListener);
    };
  }, []);

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

  // 仅在“有商品且未达免运”时收取 10；无商品或达免运 -> 0
  const deliveryFee =
    hasItems && subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const total = hasItems ? subtotal + deliveryFee : 0;

  const setAndSave = (next: CartItem[]) => {
    setCart(next);
    writeCart(next);
  };
  const removeItem = (key: string) =>
    setAndSave(cart.filter((i) => i.key !== key));
  const inc = (key: string) =>
    setAndSave(
      cart.map((i) =>
        i.key === key ? { ...i, qty: Math.min(i.qty + 1, i.stock) } : i
      )
    );
  const dec = (key: string) =>
    setAndSave(
      cart.map((i) =>
        i.key === key ? { ...i, qty: Math.max(1, i.qty - 1) } : i
      )
    );

  // 从第一步开始
  const toCheckout = () => {
    setOpen(false);
    router.push("/checkout?step=bag");
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={[
          "fixed inset-y-0 right-0 z-[9999] w-[360px] sm:w-[420px]",
          "bg-white shadow-xl transition-transform flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
      >
        {/* 头部 */}
        <div className="flex-none flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Your Bag</div>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-neutral-100"
            onClick={() => setOpen(false)}
            aria-label="Close bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 列表（复用共享组件） */}
        <div className="flex-1 overflow-y-auto p-4">
          <CartList cart={cart} onInc={inc} onDec={dec} onRemove={removeItem} />
        </div>

        {/* 底部合计 */}
        <div className="flex-none border-t p-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Subtotal</div>
            <div className="text-base font-semibold">
              {fmt(subtotal, currency)}
            </div>
          </div>

          {saved > 0 && (
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm text-neutral-600">You saved</div>
              {/* 去掉负号并保持绿色 */}
              <div className="text-sm font-semibold text-emerald-700">
                {fmt(saved, currency)}
              </div>
            </div>
          )}

          {/* 仅在有商品时显示运费行；达免运显示 FREE，否则 10 美元 */}
          {hasItems && (
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm text-neutral-600">Delivery fee</div>
              <div
                className={[
                  "text-base font-semibold",
                  subtotal >= DELIVERY_FREE_THRESHOLD
                    ? "text-emerald-700"
                    : "",
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
      </aside>
    </>,
    document.body
  );
}
