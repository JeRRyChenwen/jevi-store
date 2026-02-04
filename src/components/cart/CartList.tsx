// src/components/cart/CartList.tsx
"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

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

  // ✅ NEW: Height increase（cm）
  // 可能是 0 / 3 / 5 / 7；也可能是 undefined（旧数据或不支持该功能的产品）
  heightIncreaseCm?: number;

  // ✅ NEW: Category slugs for order persistence / analytics
  // root: always set if possible (e.g. "shoes")
  // leaf: optional (e.g. "formal-shoes"), null when product is only in a root category
  category_root_slug?: string;
  category_leaf_slug?: string | null;
};

function fmt(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

type Props = {
  cart: CartItem[];
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;

  /** 可选：是否在列表内部渲染一个“粘底”结算条（默认 false） */
  showFooter?: boolean;
};

export default function CartList({
  cart,
  onInc,
  onDec,
  onRemove,
  showFooter = false, // 默认不渲染，避免与外层（例如 BagDrawer）重复
}: Props) {
  if (cart.length === 0) {
    return <div className="text-sm text-neutral-500">Your bag is empty.</div>;
  }

  // 只有当需要显示 footer 时，这些值才有用
  const currency = cart[0]?.currency ?? "USD";
  const subtotal = showFooter
    ? cart.reduce((a, it) => a + it.price * it.qty, 0)
    : 0;
  const saved = showFooter
    ? cart.reduce((a, it) => {
        const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
        const diff = Math.max(0, base - it.price);
        return a + diff * it.qty;
      }, 0)
    : 0;

  return (
    <div className="space-y-3">
      {cart.map((it) => {
        // ✅ 宽松判断：只要 root/leaf 里包含 "shoe"（忽略大小写），就认为是鞋子
        const root = String(it.category_root_slug ?? "");
        const leaf = String(it.category_leaf_slug ?? "");
        const isShoes = /shoe/i.test(root) || /shoe/i.test(leaf);

        // ✅ Height 值：不再把 undefined 归一成 0
        // - 数字 => number
        // - 其它 => null
        const h =
          typeof it.heightIncreaseCm === "number" &&
          Number.isFinite(it.heightIncreaseCm)
            ? it.heightIncreaseCm
            : null;

        // ✅ 只有鞋子才显示 Height；鞋子哪怕 h=0 也允许显示（保持原逻辑）
        const showHeight = isShoes && typeof h === "number";

        return (
          <div
            key={it.key}
            className="flex gap-3 rounded-xl border p-3 hover:shadow-sm"
          >
            <div className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-sm font-medium">{it.title}</div>

              {/* ✅ 显示 Color / Size / Height increase */}
              <div className="mt-0.5 text-xs text-neutral-600">
                {it.color && <span>Color: {it.color}</span>}
                {it.size && <span className="ml-3">Size: {it.size}</span>}

                {/* ✅ 只有鞋子才显示 Height */}
                {showHeight && (
                  <span className="ml-3">Height: +{h} cm</span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-semibold">
                  {fmt(it.price, it.currency)}
                </div>

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

              {/* ✅ Max stock 直接用 it.stock（你这里本来就对） */}
              <div className="mt-1 text-[11px] text-neutral-500">
                Max {it.stock} available
              </div>
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
        );
      })}

      {/* 可选：仅当 showFooter=true 时，CartList 才会自己渲染一个粘底结算条 */}
      {showFooter && (
        <div
          data-testid="cartlist-footer"
          className="sticky bottom-0 left-0 right-0 border-t bg-white p-4"
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

          {/* 占位的按钮（禁用）。真正的跳转/结算逻辑请在外层容器实现。 */}
          <button
            type="button"
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white"
            aria-label="Check out (disabled in CartList)"
          >
            Check out
          </button>
        </div>
      )}
    </div>
  );
}
