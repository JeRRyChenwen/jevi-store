// src/components/bag/BagButton.tsx
"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { bag } from "@/components/bag/bag";

const LS_KEY = "bag:v1";

function getCount() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Array<{ qty?: number }>;
    return list.reduce((a, it) => a + (Number(it.qty) || 0), 0);
  } catch {
    return 0;
  }
}

export default function BagButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getCount());
    update();

    window.addEventListener("bag:updated", update as EventListener);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener("bag:updated", update as EventListener);
      window.removeEventListener("storage", update);
    };
  }, []);

  const open = () => {
    bag.setOffset(64); // 想让底部按钮更高就调这个值
    bag.open();
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open bag"
      className="relative inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full hover:bg-neutral-100"
    >
      <ShoppingBag className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] px-1 h-5 rounded-full bg-black text-white text-[11px] leading-5 text-center">
          {count}
        </span>
      )}
    </button>
  );
}
