// src/components/bag/bag.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { X, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";

/** 购物项类型（与你项目中的字段保持一致） */
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

/* ---------------- 工具函数 ---------------- */
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
  // 兼容旧事件 & 新事件（带明细）
  try {
    window.dispatchEvent(new Event("bag:updated"));
    window.dispatchEvent(new CustomEvent<CartItem[]>("bag:change", { detail: list }));
    const count = list.reduce((a, it) => a + (Number(it.qty) || 0), 0);
    window.dispatchEvent(new CustomEvent("bag:count", { detail: { count } }));
  } catch {}
}

/* ---------------- 单例挂载控制 ---------------- */
let host: HTMLDivElement | null = null;
let root: Root | null = null;
let FLOAT_OFFSET_PX = 64; // “结算区上浮高度”
const OWNER = Math.random().toString(36).slice(2, 9);

// 跟踪 open 状态，供 bag.isOpen() 使用
let OPEN_STATE = false;
function markOpenState(v: boolean) {
  OPEN_STATE = v;
}

/** 确保全局只创建一个 React Root */
function ensureMount() {
  if (typeof window === "undefined") return;
  const existed = document.getElementById("bag-root") as HTMLDivElement | null;
  if (existed) {
    host = existed;
  } else {
    host = document.createElement("div");
    host.id = "bag-root";
    host.dataset.bagOwner = OWNER;
    document.body.appendChild(host);
  }
  if (!root) {
    root = createRoot(host);
    root.render(<BagApp />);
  }
}

/* ---------------- 对外 API（无需 Provider）---------------- */
type BagEvent = "open" | "close" | "change";

function add(item: CartItem) {
  ensureMount();
  window.dispatchEvent(new CustomEvent<CartItem>("bag:add", { detail: item }));
}
function open() {
  ensureMount();
  window.dispatchEvent(new Event("bag:open"));
}
function toggle() {
  ensureMount();
  window.dispatchEvent(new Event("bag:toggle"));
}
function close() {
  ensureMount();
  window.dispatchEvent(new Event("bag:close"));
}
function setOffset(px: number) {
  FLOAT_OFFSET_PX = Math.max(0, Number(px) || 0);
  ensureMount();
  window.dispatchEvent(new CustomEvent<number>("bag:setOffset", { detail: FLOAT_OFFSET_PX }));
}
function get(): CartItem[] {
  return readCart();
}
function count(): number {
  return get().reduce((a, it) => a + (Number(it.qty) || 0), 0);
}
function isOpen(): boolean {
  return OPEN_STATE;
}
/** 订阅：open/close/change。返回 off 函数 */
function on(type: BagEvent, cb: (...args: any[]) => void) {
  if (type === "change") {
    const h1 = (e: Event) => {
      const list = (e as CustomEvent<CartItem[]>).detail;
      if (Array.isArray(list)) cb(list);
      else cb(readCart());
    };
    const h2 = (e: StorageEvent) => {
      if (!e.key || e.key === LS_KEY) cb(readCart());
    };
    window.addEventListener("bag:change", h1 as EventListener);
    window.addEventListener("storage", h2);
    return () => {
      window.removeEventListener("bag:change", h1 as EventListener);
      window.removeEventListener("storage", h2);
    };
  }

  const ev = type === "open" ? "bag:open" : "bag:close";
  const h = () => cb();
  window.addEventListener(ev, h as EventListener);
  return () => window.removeEventListener(ev, h as EventListener);
}

export const bag = { add, open, toggle, close, setOffset, get, count, isOpen, on };

/* ---------------- UI 应用（无遮罩的右侧抽屉）---------------- */
function BagApp() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [offset, setOffsetState] = useState(FLOAT_OFFSET_PX);

  useEffect(() => {
    setCart(readCart());
    // 清理历史遗留抽屉（确保唯一挂载）
    const asides = Array.from(
      document.querySelectorAll<HTMLElement>('aside[aria-label="Your bag"]')
    );
    asides.forEach((n) => {
      if (n.dataset.bagOwner && n.dataset.bagOwner !== OWNER) n.remove();
    });

    // 事件：统一从事件驱动打开/关闭/新增
    const onAdd = (e: Event) => {
      const it = (e as CustomEvent<CartItem>).detail;
      if (!it) return;
      setCart((prev) => {
        const i = prev.findIndex((x) => x.key === it.key);
        let next: CartItem[];
        if (i >= 0) {
          const cur = prev[i];
          next = [...prev];
          next[i] = { ...cur, qty: Math.min((cur.qty || 0) + (it.qty || 1), cur.stock) };
        } else {
          next = [{ ...it, qty: Math.max(1, it.qty || 1) }, ...prev];
        }
        writeCart(next);
        return next;
      });
      // 统一用事件打开，便于外部 on("open") 捕捉
      window.dispatchEvent(new Event("bag:open"));
    };
    const onOpen = () => {
      setOpen(true);
      markOpenState(true);
    };
    const onToggle = () => {
      setOpen((v) => {
        const nv = !v;
        markOpenState(nv);
        return nv;
      });
    };
    const onClose = () => {
      setOpen(false);
      markOpenState(false);
    };
    const onUpdated = () => setCart(readCart());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === LS_KEY) setCart(readCart());
    };
    const onSetOffset = (e: Event) => {
      const px = (e as CustomEvent<number>).detail;
      if (typeof px === "number") setOffsetState(px);
    };

    window.addEventListener("bag:add", onAdd as EventListener);
    window.addEventListener("bag:open", onOpen as EventListener);
    window.addEventListener("bag:toggle", onToggle as EventListener);
    window.addEventListener("bag:close", onClose as EventListener);
    window.addEventListener("bag:updated", onUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener("bag:setOffset", onSetOffset as EventListener);

    return () => {
      window.removeEventListener("bag:add", onAdd as EventListener);
      window.removeEventListener("bag:open", onOpen as EventListener);
      window.removeEventListener("bag:toggle", onToggle as EventListener);
      window.removeEventListener("bag:close", onClose as EventListener);
      window.removeEventListener("bag:updated", onUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bag:setOffset", onSetOffset as EventListener);
    };
  }, []);

  const currency = cart[0]?.currency ?? "USD";
  const hasItems = cart.length > 0;

  const subtotal = useMemo(() => cart.reduce((a, it) => a + it.price * it.qty, 0), [cart]);
  const saved = useMemo(
    () =>
      cart.reduce((a, it) => {
        const base = typeof it.basePrice === "number" ? it.basePrice : it.price;
        const diff = Math.max(0, base - it.price);
        return a + diff * it.qty;
      }, 0),
    [cart]
  );
  const deliveryFee = hasItems && subtotal < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const total = hasItems ? subtotal + deliveryFee : 0;

  const setAndSave = (next: CartItem[]) => {
    setCart(next);
    writeCart(next);
  };
  const inc = (key: string) =>
    setAndSave(
      cart.map((i) => (i.key === key ? { ...i, qty: Math.min(i.qty + 1, i.stock) } : i))
    );
  const dec = (key: string) =>
    setAndSave(
      cart.map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty - 1) } : i))
    );
  const removeItem = (key: string) => setAndSave(cart.filter((i) => i.key !== key));

  const toCheckout = () => {
    // 统一走事件关闭，外部才能收到 close
    window.dispatchEvent(new Event("bag:close"));
    location.assign("/checkout?step=bag");
  };

  // —— UI：没有任何“遮罩层” —— //
  return (
    <aside
      aria-label="Your bag"
      data-bag-owner={OWNER}
      className={[
        "fixed inset-y-0 right-0 z-[9999] w-[360px] sm:w-[420px]",
        "bg-white shadow-xl transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-full",
        "border-l",
      ].join(" ")}
    >
      <div className="relative flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Your Bag</div>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-neutral-100"
            onClick={() => window.dispatchEvent(new Event("bag:close"))}
            aria-label="Close bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-sm text-neutral-500">Your bag is empty.</div>
          ) : (
            <div className="space-y-3">
              {cart.map((it) => (
                <div key={it.key} className="flex gap-3 rounded-xl border p-3 hover:shadow-sm">
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

          {/* 让底栏有足够“上浮空间”的占位 */}
          <div style={{ height: offset }} />

          {/* Sticky footer（在滚动容器内部靠底） */}
          <div
            data-testid="bag-footer"
            className="sticky -mx-4 border-t bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
            style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${offset}px)` }}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm text-neutral-600">Subtotal</div>
              <div className="text-base font-semibold">{fmt(subtotal, currency)}</div>
            </div>

            {saved > 0 && (
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm text-neutral-600">You saved</div>
                <div className="text-sm font-semibold text-emerald-700">{fmt(saved, currency)}</div>
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

          {/* 底部安全区留白（可选） */}
          <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </div>
    </aside>
  );
}
