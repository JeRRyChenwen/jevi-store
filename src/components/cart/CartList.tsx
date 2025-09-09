// src/components/cart/CartList.tsx
"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

export type CartItem = {
  key: string; slug: string; title: string;
  price: number; basePrice?: number; currency: string;
  color?: string; size?: string; qty: number; stock: number; image?: string;
};

function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2,
  }).format(n);
}

type Props = {
  cart: CartItem[];
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;
};

export default function CartList({ cart, onInc, onDec, onRemove }: Props) {
  if (cart.length === 0) {
    return <div className="text-sm text-neutral-500">Your bag is empty.</div>;
  }

  return (
    <div className="space-y-3">
      {cart.map((it) => (
        <div key={it.key} className="flex gap-3 rounded-xl border p-3 hover:shadow-sm">
          <div className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {it.image ? (
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
                  onClick={() => onDec(it.key)}
                  aria-label="Decrease"
                  title="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2rem] text-center text-sm">{it.qty}</span>
                <button
                  type="button"
                  className="px-2 py-1 hover:bg-neutral-50"
                  onClick={() => onInc(it.key)}
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
            onClick={() => onRemove(it.key)}
            aria-label="Remove"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
