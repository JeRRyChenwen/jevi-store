// src/components/bag/bag.ts
"use client";

export type CartItemPrice = {
  currency: string;

  // ✅ 你新体系推荐字段（minor）
  price_minor?: number; // 原价
  sale_price_minor?: number; // 成交价（若有折扣）

  // 🔁 兼容旧/Strapi 字段（minor）
  price?: number; // 原价（minor）
  real_price?: number; // 成交价（minor）
  amount_minor?: number; // 成交价（minor）
};

export type CartItem = {
  key: string;
  slug: string;
  title: string;

  // ⚠️ legacy：旧 UI/旧逻辑可能仍在用（major）
  price: number;
  basePrice?: number;
  currency: string;

  // ✅ NEW：推荐用于 checkout 计算（minor）
  prices?: CartItemPrice[];

  color?: string;
  size?: string;
  heightIncreaseCm?: number;

  category_root_slug?: string;
  category_leaf_slug?: string | null;

  variantDocumentId?: string;
  sku?: string;

  // 你 AddToBagClient 里现在写了这些 sku 字段，也保留兼容
  product_sku?: string | null;
  variant_sku?: string | null;
  variantSku?: string | null;

  qty: number;
  stock: number;
  image?: string;
};

const LS_KEY = "bag:v1";

// ---------- localStorage 读写 ----------
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
  try {
    window.dispatchEvent(new Event("bag:updated"));
    window.dispatchEvent(new CustomEvent<CartItem[]>("bag:change", { detail: list }));
    const count = list.reduce((a, it) => a + (Number(it.qty) || 0), 0);
    window.dispatchEvent(new CustomEvent("bag:count", { detail: { count } }));
  } catch {}
}

// ---------- 内部状态（仅记录 open / offset） ----------
let OPEN_STATE = false;
let FLOAT_OFFSET_PX = 64;

function markOpenState(v: boolean) {
  OPEN_STATE = v;
}

// ---------- 对外 API（不渲染 UI，不注入 DOM） ----------
function add(item: CartItem) {
  const list = readCart();
  const i = list.findIndex((x) => x.key === item.key);

  if (i >= 0) {
    const cur = list[i];

    // ✅ 关键修复：同 key 再次 add 时，覆盖旧字段（尤其是 price / prices），只累计 qty
    const nextStock = Number(item.stock ?? cur.stock) || 0;
    const nextQty = Math.min((Number(cur.qty) || 0) + (Number(item.qty) || 1), nextStock || 999999);

    list[i] = {
      ...cur,     // 保留旧字段兜底
      ...item,    // ✅ 用新 item 覆盖旧字段（价格、prices、图片等）
      stock: nextStock || cur.stock,
      qty: Math.max(1, nextQty),
    };
  } else {
    list.unshift({ ...item, qty: Math.max(1, item.qty || 1) });
  }

  writeCart(list);
}

function setQty(key: string, qty: number) {
  const list = readCart();
  const i = list.findIndex((x) => x.key === key);
  if (i >= 0) {
    const cur = list[i];
    list[i] = { ...cur, qty: Math.max(1, Math.min(qty, cur.stock)) };
    writeCart(list);
  }
}

function remove(key: string) {
  writeCart(readCart().filter((x) => x.key !== key));
}

function clear() {
  writeCart([]);
}

function get(): CartItem[] {
  return readCart();
}

function count(): number {
  return get().reduce((a, it) => a + (Number(it.qty) || 0), 0);
}

function open() {
  markOpenState(true);
  window.dispatchEvent(new Event("bag:open"));
}

function toggle() {
  markOpenState(!OPEN_STATE);
  window.dispatchEvent(new Event("bag:toggle"));
}

function close() {
  markOpenState(false);
  window.dispatchEvent(new Event("bag:close"));
}

function setOffset(px: number) {
  FLOAT_OFFSET_PX = Math.max(0, Number(px) || 0);
  window.dispatchEvent(new CustomEvent<number>("bag:setOffset", { detail: FLOAT_OFFSET_PX }));
}

function isOpen() {
  return OPEN_STATE;
}

/** 订阅：open / close / change，返回 off 函数 */
function on(type: "open" | "close" | "change", cb: (...args: any[]) => void) {
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

export const bag = {
  add,
  setQty,
  remove,
  clear,
  get,
  count,
  open,
  toggle,
  close,
  setOffset,
  isOpen,
  on,
};
