// src/components/bag/BagProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { bag, type CartItem } from "./bag";

type Ctx = {
  // 抽屉可视
  open: boolean;
  setOpen: (v: boolean) => void;
  openBag: () => void;   // 兼容旧命名
  close: () => void;
  closeBag: () => void;  // 兼容 BagDrawer 里可能使用的 closeBag
  toggle: () => void;

  // 购物车数据与操作（供 BagDrawer / 其它 UI 使用）
  cart: CartItem[];
  inc: (key: string) => void;
  dec: (key: string) => void;
  removeItem: (key: string) => void;

  // 可选：底部上浮高度（若有 UI 需要用到）
  setOffset: (px: number) => void;
};

const BagCtx = createContext<Ctx | null>(null);

export function useBag() {
  const ctx = useContext(BagCtx);
  if (!ctx) throw new Error("useBag must be used within <BagProvider />");
  return ctx;
}

export default function BagProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // --- 控制可视状态：直接转发给 bag（让其它地方也能收到事件）
  const openBag = useCallback(() => bag.open(), []);
  const close = useCallback(() => bag.close(), []);
  const closeBag = close; // 兼容命名
  const toggle = useCallback(() => bag.toggle(), []);

  // --- 数量与删除：更新 localStorage，并触发变更事件
  const inc = useCallback((key: string) => {
    const item = cart.find((i) => i.key === key);
    if (!item) return;
    bag.setQty(key, Math.min((item.qty || 0) + 1, item.stock));
  }, [cart]);

  const dec = useCallback((key: string) => {
    const item = cart.find((i) => i.key === key);
    if (!item) return;
    bag.setQty(key, Math.max(1, (item.qty || 0) - 1));
  }, [cart]);

  const removeItem = useCallback((key: string) => {
    bag.remove(key);
  }, []);

  const setOffset = useCallback((px: number) => {
    bag.setOffset(px);
  }, []);

  // --- 首次加载：从 localStorage 读入
  useEffect(() => {
    setCart(bag.get());
  }, []);

  // --- 事件接入：同步 open / cart（含跨 Tab storage 事件）
  useEffect(() => {
    const offOpen = bag.on("open", () => setOpen(true));
    const offClose = bag.on("close", () => setOpen(false));

    const onChange = (list: CartItem[] | unknown) => {
      if (Array.isArray(list)) setCart(list);
      else setCart(bag.get());
    };
    const offChange = bag.on("change", onChange);

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "bag:v1") setCart(bag.get());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      offOpen && offOpen();
      offClose && offClose();
      offChange && offChange();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      open,
      setOpen,           // 仅给极少数需要直接控制的地方用；常规请走 openBag/close/toggle
      openBag,
      close,
      closeBag,
      toggle,
      cart,
      inc,
      dec,
      removeItem,
      setOffset,
    }),
    [open, openBag, close, toggle, closeBag, cart, inc, dec, removeItem, setOffset]
  );

  return <BagCtx.Provider value={value}>{children}</BagCtx.Provider>;
}
