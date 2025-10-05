// src/app/product/_components/AddToBagClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { bag, type CartItem } from "@/components/bag/bag";

type StockMap = Record<string, Record<string, number>>;
type ImagesByColor = Record<string, string[]>;

type Props = {
  slug: string;
  title: string;
  price: number | null;
  salePrice: number | null;
  currency: string;
  imagesByColor: ImagesByColor;
  stockMap: StockMap;
  fallbackColor?: string;
};

export default function AddToBagClient({
  slug,
  title,
  price,
  salePrice,
  currency,
  imagesByColor,
  stockMap,
  fallbackColor,
}: Props) {
  const sp = useSearchParams();

  const currentColor = useMemo(() => {
    const fromUrl = sp.get("color") || undefined;
    const first = Object.keys(imagesByColor)[0];
    return fromUrl || fallbackColor || first || undefined;
  }, [sp, fallbackColor, imagesByColor]);

  const currentSize = useMemo(() => sp.get("size") || undefined, [sp]);

  const stockForCurrent = useMemo(() => {
    if (!currentColor || !currentSize) return 0;
    return stockMap[currentColor]?.[currentSize] ?? 0;
  }, [currentColor, currentSize, stockMap]);

  const preview = useMemo(() => {
    if (currentColor) return imagesByColor[currentColor]?.[0];
    const any = Object.values(imagesByColor)[0]?.[0];
    return any;
  }, [currentColor, imagesByColor]);

  const unitPrice = salePrice ?? price ?? 0;

  const disabled =
    !currentColor || !currentSize || stockForCurrent <= 0 || unitPrice <= 0;

  const onAdd = () => {
    if (disabled) return;

    const item: CartItem = {
      key: `${slug}|${currentColor}|${currentSize}`,
      slug,
      title,
      price: unitPrice,
      basePrice: price ?? unitPrice,
      currency,
      color: currentColor,
      size: currentSize,
      qty: 1,
      stock: stockForCurrent,
      image: preview,
    };

    bag.add(item);      // 加入购物袋（写 localStorage + 广播更新）
    bag.setOffset(64);  // 可选：调整“Check out”上浮高度
    bag.open();         // 打开唯一的全局 Bag
  };

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className={[
          "w-full rounded-full px-6 py-3 text-sm font-semibold",
          disabled
            ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
      >
        ADD TO BAG
      </button>
    </div>
  );
}
