// src/components/nav/BagDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Plus, Minus, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

type CartItem = {
  key: string; slug: string; title: string;
  price: number; basePrice?: number; currency: string;
  color?: string; size?: string; qty: number; stock: number; image?: string;
};

const LS_KEY = "bag:v1";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;

function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2,
  }).format(n);
}
function readCart(): CartItem[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function writeCart(list: CartItem[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} window.dispatchEvent(new Event("bag:updated")); }

export default function BagDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setCart(readCart());

    const onStorage = (e: StorageEvent) => { if (e.key === LS_KEY) setCart(readCart()); };
    const openHandler = () => setOpen(true);
    const toggleHandler = () => setOpen(v => !v);
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
  const subtotal = useMemo(() => cart.reduce((a, it) => a + it.price * it.qty, 0), [cart]);
  const saved = useMemo(() => cart.reduce((a, it) => {
    const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
    const diff = Math.max(0, base - it.price);
    return a + diff * it.qty;
  }, 0), [cart]);
  const deliveryFee = subtotal >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FLAT;
  const total = subtotal + deliveryFee;

  const setAndSave = (next: CartItem[]) => { setCart(next); writeCart(next); };
  const removeItem = (key: string) => setAndSave(cart.filter(i => i.key !== key));
  const inc = (key: string) => setAndSave(cart.map(i => i.key === key ? {...i, qty: Math.min(i.qty+1, i.stock)} : i));
  const dec = (key: string) => setAndSave(cart.map(i => i.key === key ? {...i, qty: Math.max(1, i.qty-1)} : i));
  const toCheckout = () => { setOpen(false); router.push("/checkout"); };

  if (!mounted) return null;

  return createPortal(
    <>
      {open && <div className="fixed inset-0 z-[9998] bg-black/40" onClick={() => setOpen(false)} />}
      <aside
        className={[
          "fixed inset-y-0 right-0 z-[9999] w-[360px] sm:w-[420px]",
          "bg-white shadow-xl transition-transform flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog" aria-modal="true" aria-label="Your bag"
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
          ) : cart.map(it => (
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
                  <div className="text-sm font-semibold">{fmt(it.price, it.currency)}</div>
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
          ))}
        </div>

        <div className="flex-none border-t p-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Subtotal</div>
            <div className="text-base font-semibold">{fmt(subtotal, currency)}</div>
          </div>

          {saved > 0 && (
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm text-neutral-600">You saved</div>
              <div className="text-sm font-semibold text-emerald-700">- {fmt(saved, currency)}</div>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Delivery fee</div>
            <div className={["text-base font-semibold", subtotal >= DELIVERY_FREE_THRESHOLD ? "text-emerald-700" : ""].join(" ")}>
              {subtotal >= DELIVERY_FREE_THRESHOLD ? "FREE for over $100" : fmt(deliveryFee, currency)}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Total</div>
            <div className="text-lg font-bold">{fmt(total, currency)}</div>
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
  );
}
