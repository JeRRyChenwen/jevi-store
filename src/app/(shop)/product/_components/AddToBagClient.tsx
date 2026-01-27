// src/app/product/_components/AddToBagClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { bag, type CartItem } from "@/components/bag/bag";

type StockMap = Record<string, Record<string, number>>;
type Stock3 = Record<string, Record<string, Record<number, number>>>;
type Sku3 = Record<string, Record<string, Record<number, string | null>>>;
type ImagesByColor = Record<string, string[]>;

type Props = {
  slug: string;
  title: string;
  price: number | null;
  salePrice: number | null;
  currency: string;
  imagesByColor: ImagesByColor;
  stockMap: StockMap;
  stock3: Stock3;
  sku3?: Sku3;
  fallbackColor?: string;
  heightIncreaseCm?: number;

  // ✅ NEW: category root/leaf slugs (from ProductPage server side)
  categoryRootSlug?: string;
  categoryLeafSlug?: string | null;
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
  sku3,
  fallbackColor,
  heightIncreaseCm,
  categoryRootSlug,
  categoryLeafSlug,
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

  // ✅ 最终采用的 height：优先 URL，其次 props 兜底；默认 0
  const pickedHeight = useMemo(() => {
    const h =
      typeof heightFromUrl === "number" && Number.isFinite(heightFromUrl)
        ? heightFromUrl
        : typeof heightIncreaseCm === "number" && Number.isFinite(heightIncreaseCm)
        ? heightIncreaseCm
        : 0;

    return typeof h === "number" && Number.isFinite(h) ? h : 0;
  }, [heightFromUrl, heightIncreaseCm]);

  // ✅ 真实库存：优先三维库存（color+size+height）
  const stockForCurrent = useMemo(() => {
    if (!currentColor || !currentSize) return 0;

    const stockExact = stock3[currentColor]?.[currentSize]?.[pickedHeight];
    if (typeof stockExact === "number" && Number.isFinite(stockExact)) {
      return stockExact;
    }

    // 兜底：如果三维不存在（历史数据/未建 0cm 变体），回退到汇总库存
    return stockMap[currentColor]?.[currentSize] ?? 0;
  }, [currentColor, currentSize, pickedHeight, stock3, stockMap]);

  // ✅ NEW：当前变体 SKU（用于下单后扣库存）
  const variantSku = useMemo(() => {
    if (!currentColor || !currentSize) return null;
    const sku = sku3?.[currentColor]?.[currentSize]?.[pickedHeight];
    return typeof sku === "string" && sku.trim() ? sku.trim() : null;
  }, [currentColor, currentSize, pickedHeight, sku3]);

  const preview = useMemo(() => {
    if (currentColor) return imagesByColor[currentColor]?.[0];
    const any = Object.values(imagesByColor)[0]?.[0];
    return any;
  }, [currentColor, imagesByColor]);

  const unitPrice = salePrice ?? price ?? 0;

  // ✅ disabled：由 color/size/stock/price 决定
  const disabled = !currentColor || !currentSize || stockForCurrent <= 0 || unitPrice <= 0;

  const onAdd = () => {
    if (disabled) return;

    const heightPart = String(pickedHeight);

    // ✅ 关键：把 SKU 写入购物袋 item（后端 /orders 会用 product_sku 落库）
    // 说明：
    // - product_sku：沿用你 orders.ts 里写库字段名（product_sku）
    // - variant_sku / variantSku：额外冗余，方便你前端/后端后续演进
    const item = {
      key: `${slug}|${currentColor}|${currentSize}|${heightPart}`,
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

      heightIncreaseCm: pickedHeight,

      // ✅ NEW: category root/leaf (persist into bag -> checkout -> worker)
      category_root_slug: categoryRootSlug ?? "uncategorized",
      category_leaf_slug: categoryLeafSlug ?? null,

      // ✅ NEW
      product_sku: variantSku, // 给 orders.ts 用（你现在 log 里这里是 null）
      variant_sku: variantSku,
      variantSku: variantSku,
    } as unknown as CartItem;

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

      {/* 可选：调试用（不想显示就删掉这段） */}
      {/* <div className="mt-2 text-xs text-neutral-500">
        SKU: {variantSku ?? "—"}
      </div> */}
    </div>
  );
}
