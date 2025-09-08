// src/app/product/_components/AddToBagClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Trash2, Plus, Minus, ChevronRight } from "lucide-react";

type StockMap = Record<string, Record<string, number>>;
type ImagesByColor = Record<string, string[]>;

type Props = {
  slug: string;
  title: string;
  price: number | null;
  salePrice: number | null;
  currency: string;
  imagesByColor: ImagesByColor;
  stockMap: StockMap;
};

type CartItem = {
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

function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function AddToBagClient({
  slug,
  title,
  price,
  salePrice,
  currency,
  imagesByColor,
  stockMap,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  // ===== 当前选择（来自 URL） =====
  const currentColor = useMemo(() => sp.get("color") || undefined, [sp]);
  const currentSize  = useMemo(() => sp.get("size")  || undefined, [sp]);

  const stockForCurrent = useMemo(() => {
    if (!currentColor || !currentSize) return 0;
    return stockMap[currentColor]?.[currentSize] ?? 0;
  }, [currentColor, currentSize, stockMap]);

  const preview = useMemo(() => {
    if (currentColor) return imagesByColor[currentColor]?.[0];
    const any = Object.values(imagesByColor)[0]?.[0];
    return any;
  }, [currentColor, imagesByColor]);

  const unitPrice = salePrice ?? price ?? 0;

  // ===== 购物袋：懒初始化（从 localStorage 取），避免首帧写空 =====
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [open, setOpen] = useState(false);

  // 写回 localStorage + 通知全局抽屉刷新（不会再把非空覆盖成 [] 了）
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event("bag:updated"));
      const count = cart.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      window.dispatchEvent(new CustomEvent("bag:count", { detail: { count } }));
    } catch {}
  }, [cart]);

  const subtotal = cart.reduce((acc, it) => acc + it.price * it.qty, 0);
  const saved = cart.reduce((acc, it) => {
    const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
    const diff = base - it.price;
    return acc + (diff > 0 ? diff * it.qty : 0);
  }, 0);
  const deliveryFee = subtotal >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FLAT;
  const total = subtotal + deliveryFee;

  // （可选）监听全局打开/关闭事件，保留页面内抽屉逻辑
  useEffect(() => {
    const onOpen   = () => setOpen(true);
    const onClose  = () => setOpen(false);
    const onToggle = () => setOpen(v => !v);
    window.addEventListener("bag:open",   onOpen as EventListener);
    window.addEventListener("bag:close",  onClose as EventListener);
    window.addEventListener("bag:toggle", onToggle as EventListener);
    return () => {
      window.removeEventListener("bag:open",   onOpen as EventListener);
      window.removeEventListener("bag:close",  onClose as EventListener);
      window.removeEventListener("bag:toggle", onToggle as EventListener);
    };
  }, []);

  // ===== 操作 =====
  const addCurrentToBag = () => {
    if (!currentColor || !currentSize || stockForCurrent <= 0) return;
    const key = `${slug}|${currentColor}|${currentSize}`;
    setCart(prev => {
      const i = prev.findIndex(x => x.key === key);
      if (i >= 0) {
        const next = [...prev];
        const it = next[i];
        next[i] = { ...it, qty: Math.min(it.qty + 1, it.stock) };
        return next;
      }
      const it: CartItem = {
        key,
        slug,
        title,
        price: unitPrice,
        basePrice: price ?? unitPrice,
        currency,
        color: currentColor,
        size: currentSize,
        qty: 1,
        stock: stockForCurrent,
        image: preview,
      };
      return [it, ...prev];
    });

    setOpen(true);                 // 本页抽屉（可选）
    window.dispatchEvent(new Event("bag:open")); // ✅ 打开全局抽屉
  };

  const removeItem = (key: string) =>
    setCart(prev => prev.filter(x => x.key !== key));
  const inc = (key: string) =>
    setCart(prev => prev.map(x => x.key === key ? { ...x, qty: Math.min(x.qty + 1, x.stock) } : x));
  const dec = (key: string) =>
    setCart(prev => prev.map(x => x.key === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x));
  const toCheckout = () => { setOpen(false); router.push("/checkout"); };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const disabledAdd =
    !currentColor || !currentSize || stockForCurrent <= 0 || unitPrice <= 0;

  return (
    <>
      {/* 主按钮 */}
      <div className="pt-2">
        <button
          type="button"
          disabled={disabledAdd}
          onClick={addCurrentToBag}
          className={[
            "w-full rounded-full px-6 py-3 text-sm font-semibold",
            disabledAdd
              ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
              : "bg-neutral-900 text-white hover:bg-neutral-800",
          ].join(" ")}
        >
          ADD TO BAG
        </button>

        {(!currentColor || !currentSize) && (
          <div className="mt-2 text-xs text-neutral-500">
            Please select color & size
          </div>
        )}
      </div>

      {/* 页面内抽屉（如果你只想用全局抽屉，这块可以删掉） */}
      {mounted &&
        createPortal(
          <>
            {open && (
              <div className="fixed inset-0 z-[9998] bg-black/40" onClick={() => setOpen(false)} />
            )}

            <aside
              className={[
                "fixed inset-y-0 right-0 z-[9999] w-[360px] sm:w-[420px]",
                "bg-white shadow-xl transition-transform",
                open ? "translate-x-0" : "translate-x-full",
                "flex flex-col",
              ].join(" ")}
              role="dialog"
              aria-modal="true"
              aria-label="Your bag"
            >
              <div className="flex-none flex items-center justify-between border-b px-4 py-3">
                <div className="font-semibold">Your Bag</div>
                <button type="button" className="rounded-full p-2 hover:bg-neutral-100" onClick={() => setOpen(false)} aria-label="Close bag">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-sm text-neutral-500">Your bag is empty.</div>
                ) : (
                  cart.map(it => (
                    <div key={it.key} className="flex gap-3 rounded-xl border p-3 hover:shadow-sm">
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {it.image ? <img src={it.image} alt={it.title} className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium">{it.title}</div>
                        <div className="mt-0.5 text-xs text-neutral-600">
                          {it.color && <span>Color: {it.color}</span>}
                          {it.size && <span className="ml-3">Size: {it.size}</span>}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-sm font-semibold">{fmtPrice(it.price, it.currency)}</div>
                          <div className="flex items-center rounded-full border">
                            <button type="button" className="px-2 py-1 hover:bg-neutral-50" onClick={() => dec(it.key)} aria-label="Decrease">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm">{it.qty}</span>
                            <button type="button" className="px-2 py-1 hover:bg-neutral-50" onClick={() => inc(it.key)} aria-label="Increase" disabled={it.qty >= it.stock}>
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500">Max {it.stock} available</div>
                      </div>
                      <button type="button" className="self-start rounded-full p-2 text-neutral-500 hover:bg-neutral-100" onClick={() => removeItem(it.key)} aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex-none border-t p-4 pb-[env(safe-area-inset-bottom)]">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-sm text-neutral-600">Subtotal</div>
                  <div className="text-base font-semibold">{fmtPrice(subtotal, currency)}</div>
                </div>

                {saved > 0 && (
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm text-neutral-600">You saved</div>
                    <div className="text-sm font-semibold text-emerald-700">- {fmtPrice(saved, currency)}</div>
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm text-neutral-600">Delivery fee</div>
                  <div className={["text-sm font-semibold", subtotal >= DELIVERY_FREE_THRESHOLD ? "text-emerald-700" : ""].join(" ")}>
                    {subtotal >= DELIVERY_FREE_THRESHOLD ? "FREE for over $100" : fmtPrice(deliveryFee, currency)}
                  </div>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">Total</div>
                  <div className="text-lg font-bold">{fmtPrice(total, currency)}</div>
                </div>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={toCheckout}
                  className={[
                    "w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold",
                    cart.length === 0 ? "bg-neutral-200 text-neutral-500 cursor-not-allowed" : "bg-neutral-900 text-white hover:bg-neutral-800",
                  ].join(" ")}
                >
                  Checkout <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
