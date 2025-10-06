// src/components/bag/bag.ts
"use client";

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
    list[i] = { ...cur, qty: Math.min((cur.qty || 0) + (item.qty || 1), cur.stock) };
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
  // 数据
  add,
  setQty,
  remove,
  clear,
  get,
  count,
  // 可视状态
  open,
  toggle,
  close,
  setOffset,
  isOpen,
  // 订阅
  on,
};
