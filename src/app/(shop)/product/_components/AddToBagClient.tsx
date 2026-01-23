// src/app/product/_components/AddToBagClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { bag, type CartItem } from "@/components/bag/bag";

type StockMap = Record<string, Record<string, number>>;
type Stock3 = Record<string, Record<string, Record<number, number>>>;
type ImagesByColor = Record<string, string[]>;

type Props = {
  slug: string;
  title: string;
  price: number | null;
  salePrice: number | null;
  currency: string;
  imagesByColor: ImagesByColor;

  // sizesSum：color+size 的汇总库存（用于 size 列表、兜底等）
  stockMap: StockMap;

  // ✅ NEW：三维库存：color+size+height 的真实库存
  stock3: Stock3;

  fallbackColor?: string;

  // 从 page.tsx 传入（server side 算出来的 validHeight），这里作为兜底
  heightIncreaseCm?: number;
};

export default function AddToBagClient({
  slug,
  title,
  price,
  salePrice,
  currency,
  imagesByColor,
  stockMap,
  stock3,
  fallbackColor,
  heightIncreaseCm,
}: Props) {
  const sp = useSearchParams();

  const currentColor = useMemo(() => {
    const fromUrl = sp.get("color") || undefined;
    const first = Object.keys(imagesByColor)[0];
    return fromUrl || fallbackColor || first || undefined;
  }, [sp, fallbackColor, imagesByColor]);

  const currentSize = useMemo(() => sp.get("size") || undefined, [sp]);

  // ✅ 从 URL 读 height（允许 0）
  const heightFromUrl = useMemo(() => {
    const raw = sp.get("height");
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [sp]);

  // ✅ 最终采用的 height：优先 URL，其次 props 兜底
  // ✅ 允许 0（+0cm）
  const pickedHeight = useMemo(() => {
    const h =
      typeof heightFromUrl === "number" && Number.isFinite(heightFromUrl)
        ? heightFromUrl
        : typeof heightIncreaseCm === "number" && Number.isFinite(heightIncreaseCm)
        ? heightIncreaseCm
        : 0; // 默认 0

    return typeof h === "number" && Number.isFinite(h) ? h : 0;
  }, [heightFromUrl, heightIncreaseCm]);

  // ✅ 真实库存：优先三维库存（color+size+height）
  // - 如果 height=0 你在 Strapi 也建了 0cm 变体，那这里会拿到 0cm 的真实库存
  // - 如果某个组合不存在（例如该 size 没有 7cm），则返回 0（会禁用加购）
  const stockForCurrent = useMemo(() => {
    if (!currentColor || !currentSize) return 0;

    const stockExact = stock3[currentColor]?.[currentSize]?.[pickedHeight];
    if (typeof stockExact === "number" && Number.isFinite(stockExact)) {
      return stockExact;
    }

    // 兜底：如果三维不存在（历史数据/未建 0cm 变体），回退到汇总库存
    return stockMap[currentColor]?.[currentSize] ?? 0;
  }, [currentColor, currentSize, pickedHeight, stock3, stockMap]);

  const preview = useMemo(() => {
    if (currentColor) return imagesByColor[currentColor]?.[0];
    const any = Object.values(imagesByColor)[0]?.[0];
    return any;
  }, [currentColor, imagesByColor]);

  const unitPrice = salePrice ?? price ?? 0;

  // ✅ 不再出现 “SELECT HEIGHT”
  // ✅ disabled 只由 color/size/stock/price 决定（height 由 Height picker 控制，默认 0 也是合法）
  const disabled =
    !currentColor || !currentSize || stockForCurrent <= 0 || unitPrice <= 0;

  const onAdd = () => {
    if (disabled) return;

    const heightPart = String(pickedHeight);

    const item: CartItem = {
      key: `${slug}|${currentColor}|${currentSize}|${heightPart}`,
      slug,
      title,
      price: unitPrice,
      basePrice: price ?? unitPrice,
      currency,
      color: currentColor,
      size: currentSize,
      qty: 1,

      // ✅ 关键：写入真实库存（用于抽屉里 Max xx available + 禁用 + 递增上限）
      stock: stockForCurrent,

      image: preview,

      // ✅ NEW: 存入购物袋
      heightIncreaseCm: pickedHeight,
    };

    bag.add(item);

    if (typeof (bag as any).setOffset === "function") {
      (bag as any).setOffset(64);
    }

    if (typeof window !== "undefined") {
      queueMicrotask(() => {
        requestAnimationFrame(() => bag.open());
      });
    } else {
      bag.open();
    }
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
