// src/components/bag/BagButton.tsx
"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bag, type CartItem } from "@/components/bag/bag";

function calcCount(list: CartItem[]) {
  return list.reduce((a, it) => a + (Number(it.qty) || 0), 0);
}

export default function BagButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(calcCount(bag.get()));

    const offChange = bag.on("change", (list: CartItem[]) => {
      setCount(calcCount(list));
    });

    return () => {
      offChange();
    };
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="!h-12 !w-12 md:!h-14 md:!w-14 relative"
      aria-label="open bag"
      onClick={() => {
        // 现在抽屉 footer 已经贴底，不需要偏移；如果你仍想用，可以改数字
        // bag.setOffset(64);
        bag.open();
      }}
    >
      <ShoppingBag className="!h-6 !w-6 md:!h-6 md:!w-6" />

      {count > 0 && (
        <span
          className="
            absolute top-[2px] right-[4px]
            h-4 min-w-4 px-1
            rounded-full bg-black text-white
            text-[10px] leading-4 text-center
            pointer-events-none select-none
          "
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
