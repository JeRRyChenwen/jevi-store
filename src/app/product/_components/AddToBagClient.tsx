// src/app/product/_components/AddToBagClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Trash2, Plus, Minus, ChevronRight } from "lucide-react";

type StockMap = Record<string, Record<string, number>>;
type ImagesByColor = Record<string, string[]>;

type Props = {
  slug: string;
  title: string;
  price: number | null;       // 原价
  salePrice: number | null;   // 促销价（无促销时为 null）
  currency: string;
  imagesByColor: ImagesByColor;
  stockMap: StockMap;
};

type CartItem = {
  key: string;          // slug|color|size
  slug: string;
  title: string;
  price: number;        // 加入时使用（salePrice ?? price）
  currency: string;
  color?: string;
  size?: string;
  qty: number;
  stock: number;        // 该组合可用库存（上限）
  image?: string;
};

const LS_KEY = "bag:v1";

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
  const pathname = usePathname();
  const sp = useSearchParams();

  // 当前选择（来自 URL）
  const currentColor = useMemo(() => {
    const c = sp.get("color") || undefined;
    return c || undefined;
  }, [sp]);

  const currentSize = useMemo(() => {
    const s = sp.get("size") || undefined;
    return s || undefined;
  }, [sp]);

  // 当前组合库存与主图
  const stockForCurrent = useMemo(() => {
    if (!currentColor || !currentSize) return 0;
    return stockMap[currentColor]?.[currentSize] ?? 0;
  }, [currentColor, currentSize, stockMap]);

  const preview = useMemo(() => {
    if (currentColor) return imagesByColor[currentColor]?.[0];
    // 没选颜色时，任意取一张
    const any = Object.values(imagesByColor)[0]?.[0];
    return any;
  }, [currentColor, imagesByColor]);

  const unitPrice = (salePrice ?? price ?? 0);

  // ===== 购物袋状态（localStorage 持久化） =====
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const subtotal = cart.reduce((acc, it) => acc + it.price * it.qty, 0);

  // ===== 操作 =====
  const addCurrentToBag = () => {
    if (!currentColor || !currentSize) {
      // 没选齐：滚动到颜色/尺码位置 or 给出轻提示，这里简单禁用按钮即可
      return;
    }
    const stock = stockForCurrent;
    if (stock <= 0) return;

    const key = `${slug}|${currentColor}|${currentSize}`;
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.key === key);
      if (idx >= 0) {
        const next = [...prev];
        const item = next[idx];
        const newQty = Math.min(item.qty + 1, item.stock);
        next[idx] = { ...item, qty: newQty };
        return next;
      }
      const newItem: CartItem = {
        key,
        slug,
        title,
        price: unitPrice,
        currency,
        color: currentColor,
        size: currentSize,
        qty: 1,
        stock,
        image: preview,
      };
      return [newItem, ...prev];
    });
    setOpen(true);
  };

  const removeItem = (key: string) =>
    setCart((prev) => prev.filter((x) => x.key !== key));

  const inc = (key: string) =>
    setCart((prev) =>
      prev.map((x) =>
        x.key === key ? { ...x, qty: Math.min(x.qty + 1, x.stock) } : x
      )
    );

  const dec = (key: string) =>
    setCart((prev) =>
      prev
        .map((x) => (x.key === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
        .filter(Boolean) as CartItem[]
    );

  const toCheckout = () => {
    // 这里只做演示：你可以跳到 /checkout，或触发支付流程
    setOpen(false);
    router.push("/checkout");
  };

  // ===== UI =====
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

        {/* 次要信息 */}
        <div className="mt-2 text-xs text-neutral-500">
          {(!currentColor || !currentSize) && (
            <span>Please select color & size</span>
          )}
          {currentColor && currentSize && (
            <>
              In stock:{" "}
              <span
                className={[
                  "font-medium",
                  stockForCurrent > 0 ? "text-neutral-700" : "text-rose-600",
                ].join(" ")}
              >
                {stockForCurrent > 0 ? stockForCurrent : "0 (Out of stock)"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 右侧抽屉 */}
      <aside
        className={[
          "fixed right-0 top-0 z-50 h-full w-[360px] sm:w-[420px] bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Your Bag</div>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-neutral-100"
            onClick={() => setOpen(false)}
            aria-label="Close bag"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 列表 */}
        <div className="h-[calc(100%-160px)] overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-sm text-neutral-500">Your bag is empty.</div>
          ) : (
            cart.map((it) => (
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
                  <div className="line-clamp-1 text-sm font-medium">
                    {it.title}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-600">
                    {it.color && <span>Color: {it.color}</span>}
                    {it.size && <span className="ml-3">Size: {it.size}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {fmtPrice(it.price, it.currency)}
                    </div>

                    {/* 数量步进器 */}
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
                      <span className="min-w-[2rem] text-center text-sm">
                        {it.qty}
                      </span>
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

                  <div className="mt-1 text-[11px] text-neutral-500">
                    Max {it.stock} available
                  </div>
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
            ))
          )}
        </div>

        {/* 底部合计 */}
        <div className="border-t p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-neutral-600">Subtotal</div>
            <div className="text-base font-semibold">
              {fmtPrice(subtotal, currency)}
            </div>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={toCheckout}
            className={[
              "w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold",
              cart.length === 0
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                : "bg-neutral-900 text-white hover:bg-neutral-800",
            ].join(" ")}
          >
            Checkout
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
