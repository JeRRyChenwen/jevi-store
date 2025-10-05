// src/components/bag/BagSheet.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBag } from "./BagProvider";

export type CartItem = {
  key: string;
  slug: string;
  title: string;
  price: number;
  basePrice?: number;
  currency: string;
  color?: string;
  size?: string;
  qty: number;
  stock: number;
  image?: string;
};

const LS_KEY = "bag:v1";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

// === 这里控制“按钮上浮距离” ===
const FLOAT_OFFSET_PX = 64;
// === 底栏块自身大概高度（用于滚动空间预留）===
const FOOTER_ESTIMATE_PX = 160;

function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}
function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function writeCart(list: CartItem[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  try { window.dispatchEvent(new Event("bag:updated")); } catch {}
}

export default function BagSheet() {
  const { open, setOpen, close } = useBag();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);
  const [owner] = useState(() => `bag-${Math.random().toString(36).slice(2, 9)}`);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setCart(readCart());
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === LS_KEY) setCart(readCart()); };
    const onUpdated = () => setCart(readCart());
    window.addEventListener("storage", onStorage);
    window.addEventListener("bag:updated", onUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bag:updated", onUpdated as EventListener);
    };
  }, []);

  // 标记本实例并移除旧的遗留抽屉
  useEffect(() => {
    const el = asideRef.current as HTMLElement | null;
    if (!el) return;
    el.dataset.bagOwner = owner;
    const others = Array.from(
      document.querySelectorAll<HTMLElement>('aside[aria-label="Your bag"]')
    ).filter((n) => n !== el);
    others.forEach((n) => {
      if (n.dataset.bagOwner && n.dataset.bagOwner !== owner) n.remove();
    });
  }, [owner, open]);

  const setAndSave = (next: CartItem[]) => { setCart(next); writeCart(next); };
  const inc = (key: string) =>
    setAndSave(cart.map(i => i.key === key ? { ...i, qty: Math.min(i.qty + 1, i.stock) } : i));
  const dec = (key: string) =>
    setAndSave(cart.map(i => i.key === key ? { ...i, qty: Math.max(1, i.qty - 1) } : i));
  const removeItem = (key: string) => setAndSave(cart.filter(i => i.key !== key));

  const currency = cart[0]?.currency ?? "USD";
  const hasItems = cart.length > 0;

  const subtotal = useMemo(() => cart.reduce((a, it) => a + it.price * it.qty, 0), [cart]);
  const saved = useMemo(
    () => cart.reduce((a, it) => {
      const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
      const diff = Math.max(0, base - it.price);
      return a + diff * it.qty;
    }, 0),
    [cart]
  );
  const deliveryFee = hasItems && subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const total = hasItems ? subtotal + deliveryFee : 0;

  const toCheckout = () => {
    setOpen(false);
    router.push("/checkout?step=bag");
  };

  if (!mounted) return null;

  return createPortal(
    <aside
      ref={(n) => (asideRef.current = n)}
      aria-label="Your bag"
      className={[
        "fixed inset-y-0 right-0 z-[9999] w-[360px] sm:w-[420px]",
        "bg-white shadow-xl transition-transform",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      {/* 作为定位参照容器 */}
      <div className="relative flex h-full flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Your Bag</div>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-neutral-100"
            onClick={close}
            aria-label="Close bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 滚动区：把“底栏”放到这个滚动区内，用 sticky 来上浮 */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-sm text-neutral-500">Your bag is empty.</div>
          ) : (
            <div className="space-y-3">
              {cart.map((it) => (
                <div
                  key={it.key}
                  className="flex gap-3 rounded-xl border p-3 hover:shadow-sm"
                >
                  <div className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt={it.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-medium">{it.title}</div>
                    <div className="mt-0.5 text-xs text-neutral-600">
                      {it.color && <span>Color: {it.color}</span>}
                      {it.size && <span className="ml-3">Size: {it.size}</span>}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-semibold">{fmt(it.price, it.currency)}</div>
                      <div className="flex items-center rounded-full border">
                        <button
                          type="button"
                          className="px-2 py-1 hover:bg-neutral-50"
                          onClick={() => dec(it.key)}
                          aria-label="Decrease"
                          title="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm">{it.qty}</span>
                        <button
                          type="button"
                          className="px-2 py-1 hover:bg-neutral-50"
                          onClick={() => inc(it.key)}
                          aria-label="Increase"
                          title="Increase"
                          disabled={it.qty >= it.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 text-[11px] text-neutral-500">Max {it.stock} available</div>
                  </div>

                  <button
                    type="button"
                    className="self-start rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                    onClick={() => removeItem(it.key)}
                    aria-label="Remove"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 预留空间：保证 sticky 底栏有“上浮距离”的滚动余量 */}
          <div style={{ height: FLOAT_OFFSET_PX }} />

          {/* 底栏：sticky + bottom(calc(... + 上浮像素))，并横向撑满（-mx-4 / px-4） */}
          <div
            data-testid="bag-footer"
            className="sticky -mx-4 border-t bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
            style={{
              bottom: `calc(env(safe-area-inset-bottom, 0px) + ${FLOAT_OFFSET_PX}px)`,
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

          {/* 再加一点底部安全区的留白（可选） */}
          <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </div>
    </aside>,
    document.body
  );
}
