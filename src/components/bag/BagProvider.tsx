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

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openBag: () => void;
  close: () => void;
  toggle: () => void;
};

const BagCtx = createContext<Ctx | null>(null);

export function useBag() {
  const ctx = useContext(BagCtx);
  if (!ctx) throw new Error("useBag must be used within <BagProvider />");
  return ctx;
}

export default function BagProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openBag = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  // 当前实例的“所有者 id”
  const [owner] = useState(() => `bag-${Math.random().toString(36).slice(2, 9)}`);

  // 保险：清理不是本实例的遗留抽屉（仅清理带 data-bag-owner 的）
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('aside[aria-label="Your bag"]')
    );
    els.forEach((el) => {
      const ownerAttr = el.dataset.bagOwner;
      if (ownerAttr && ownerAttr !== owner) {
        el.remove(); // 直接移除旧的
      }
    });
  }, [owner, open]);

  const value = useMemo(
    () => ({ open, setOpen, openBag, close, toggle }),
    [open, openBag, close, toggle]
  );

  return <BagCtx.Provider value={value}>{children}</BagCtx.Provider>;
}
