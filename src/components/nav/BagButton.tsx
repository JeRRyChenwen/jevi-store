// src/components/nav/BagButton.tsx
"use client";

import { ShoppingBag } from "lucide-react"; // 背包样式图标
import { useEffect, useState } from "react";

const LS_KEY = "bag:v1"; // 和 AddToBagClient 用的一致

export default function BagButton() {
  const [qty, setQty] = useState(0);

  // 读本地购物袋数量（可选：显示小红点）
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        const items = raw ? JSON.parse(raw) as Array<{ qty: number }> : [];
        setQty(items.reduce((a, b) => a + (b?.qty || 0), 0));
      } catch {
        setQty(0);
      }
    };
    read();

    // 来自其它地方的变动（例如 AddToBagClient 更新后可以 dispatch 这个事件）
    const onUpdated = () => read();
    window.addEventListener("bag:updated", onUpdated);
    window.addEventListener("storage", onUpdated);
    return () => {
      window.removeEventListener("bag:updated", onUpdated);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  const openDrawer = () => {
    // 让右侧抽屉打开（AddToBagClient 里监听 bag:toggle / bag:open）
    window.dispatchEvent(new CustomEvent("bag:toggle"));
  };

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label="Open bag"
      title="Open bag"
      className="relative rounded-full p-2 hover:bg-neutral-100"
    >
      <ShoppingBag className="h-5 w-5" />
      {qty > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-black px-1 text-center text-[11px] font-semibold text-white">
          {qty}
        </span>
      )}
    </button>
  );
}
