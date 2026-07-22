// src/app/product/_components/AddToBagClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { bag, type CartItem } from "@/components/bag/bag";

type StockMap = Record<string, Record<string, number>>;
type Stock3 = Record<string, Record<string, Record<number, number>>>;
type Sku3 = Record<string, Record<string, Record<number, string | null>>>;
type ImagesByColor = Record<string, string[]>;
type CardImagesByColor = Record<string, string>;

type Props = {
  slug: string;
  title: string;

  /** ✅ 这里仍然是 major（元），来自 PDP 计算后的展示价 */
  price: number | null; // base major
  salePrice: number | null; // effective major
  currency: string;

  /** 商品详情页 Gallery 使用 color_galleries.images */
  imagesByColor: ImagesByColor;

  /** Shopping Bag、Checkout 和订单使用 color_galleries.card_image */
  cardImagesByColor: CardImagesByColor;

  stockMap: StockMap;
  stock3: Stock3;
  sku3?: Sku3;
  fallbackColor?: string;
  heightIncreaseCm?: number;

  categoryRootSlug?: string;
  categoryLeafSlug?: string | null;
};

// ---------- helpers ----------
const toMinor2 = (major: number) =>
  Math.max(0, Math.round(Number(major || 0) * 100));

export default function AddToBagClient({
  slug,
  title,
  price,
  salePrice,
  currency,
  imagesByColor,
  cardImagesByColor,
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

    const firstGalleryColor = Object.keys(imagesByColor)[0];
    const firstCardImageColor = Object.keys(cardImagesByColor)[0];

    return (
      fromUrl ||
      fallbackColor ||
      firstGalleryColor ||
      firstCardImageColor ||
      undefined
    );
  }, [sp, fallbackColor, imagesByColor, cardImagesByColor]);

  const currentSize = useMemo(() => sp.get("size") || undefined, [sp]);

  // ✅ 宽松判断：只要 root/leaf 里包含 "shoe"（忽略大小写），就认为是鞋子
  const isShoes = useMemo(() => {
    const root = String(categoryRootSlug ?? "");
    const leaf = String(categoryLeafSlug ?? "");
    return /shoe/i.test(root) || /shoe/i.test(leaf);
  }, [categoryRootSlug, categoryLeafSlug]);

  // ✅ 从 URL 读 height（允许 0）
  const heightFromUrl = useMemo(() => {
    const raw = sp.get("height");
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }, [sp]);

  // ✅ 用户/页面选中的 height（仅鞋子有意义）
  const pickedHeight = useMemo(() => {
    const h =
      typeof heightFromUrl === "number" && Number.isFinite(heightFromUrl)
        ? heightFromUrl
        : typeof heightIncreaseCm === "number" &&
            Number.isFinite(heightIncreaseCm)
          ? heightIncreaseCm
          : 0;

    return typeof h === "number" && Number.isFinite(h) ? h : 0;
  }, [heightFromUrl, heightIncreaseCm]);

  // ✅ 用于库存 / SKU 查找：
  // - 鞋子：用 pickedHeight
  // - 非鞋子：强制用 0（避免三维表查不到）
  const pickedHeightForLookup = useMemo(() => {
    return isShoes ? pickedHeight : 0;
  }, [isShoes, pickedHeight]);

  // ✅ 写入 cart snapshot：
  // - 鞋子：写 number（可为 0/2/4...）
  // - 非鞋子：不写（undefined），从源头杜绝 "Height: +0 cm"
  const heightForSnapshot = useMemo(() => {
    return isShoes ? pickedHeight : undefined;
  }, [isShoes, pickedHeight]);

  // ✅ 真实库存：优先三维库存（color+size+heightForLookup）
  const stockForCurrent = useMemo(() => {
    if (!currentColor || !currentSize) return 0;

    const stockExact =
      stock3[currentColor]?.[currentSize]?.[pickedHeightForLookup];

    if (typeof stockExact === "number" && Number.isFinite(stockExact)) {
      return stockExact;
    }

    // 兜底：回退到汇总库存
    return stockMap[currentColor]?.[currentSize] ?? 0;
  }, [currentColor, currentSize, pickedHeightForLookup, stock3, stockMap]);

  // ✅ 当前变体 SKU（用于下单后扣库存）
  const variantSku = useMemo(() => {
    if (!currentColor || !currentSize) return null;

    const sku = sku3?.[currentColor]?.[currentSize]?.[pickedHeightForLookup];

    return typeof sku === "string" && sku.trim() ? sku.trim() : null;
  }, [currentColor, currentSize, pickedHeightForLookup, sku3]);

  const preview = useMemo(() => {
    if (currentColor) {
      // 1. 优先使用当前颜色对应的 card_image。
      const cardImage = cardImagesByColor[currentColor];

      if (typeof cardImage === "string" && cardImage.trim()) {
        return cardImage;
      }

      // 2. 如果当前颜色没有设置 card_image，
      //    回退到商品详情页 Gallery 的第一张图片。
      const galleryImage = imagesByColor[currentColor]?.[0];

      if (typeof galleryImage === "string" && galleryImage.trim()) {
        return galleryImage;
      }
    }

    // 3. 如果没有有效的当前颜色，尝试使用任意一个 card_image。
    const firstCardImage = Object.values(cardImagesByColor).find(
      (value) => typeof value === "string" && value.trim(),
    );

    if (firstCardImage) {
      return firstCardImage;
    }

    // 4. 最后再回退到任意颜色的 Gallery 第一张图片。
    const firstGalleryImages = Object.values(imagesByColor).find(
      (value) =>
        Array.isArray(value) && typeof value[0] === "string" && value[0].trim(),
    );

    return firstGalleryImages?.[0];
  }, [currentColor, cardImagesByColor, imagesByColor]);

  /** ✅ unitPrice 仍然是 major（元） */
  const unitPriceMajor = salePrice ?? price ?? 0;
  const basePriceMajor = price ?? unitPriceMajor;

  // ✅ disabled：由 color/size/stock/price 决定
  const disabled =
    !currentColor ||
    !currentSize ||
    stockForCurrent <= 0 ||
    unitPriceMajor <= 0;

  const onAdd = () => {
    if (disabled) return;

    // ✅ key 仍然用 lookup height（非鞋子恒为 0，避免同色同尺码重复 key）
    const heightPart = String(pickedHeightForLookup);

    // ✅ 关键：同时写入 prices[]（minor, 分）——让 cart/checkout 统一走 minor 路径
    const ccy =
      String(currency || "")
        .trim()
        .toUpperCase() || "AUD";

    const baseMinor = toMinor2(basePriceMajor);
    const effMinor = toMinor2(unitPriceMajor);

    const item = {
      key: `${slug}|${currentColor}|${currentSize}|${heightPart}`,
      slug,
      title,

      // ✅ legacy/compat：保留 major 字段（有的旧 UI/旧逻辑会读）
      price: unitPriceMajor, // major（成交价）
      basePrice: basePriceMajor, // major（原价）
      currency: ccy,

      // ✅ NEW：推荐统一读取这个（minor）
      prices: [
        {
          currency: ccy,
          price_minor: baseMinor,
          sale_price_minor: effMinor < baseMinor ? effMinor : undefined,
          // 不写 sale window：你的 pricing.ts 会把 undefined 当“总是激活窗口”
        },
      ],

      color: currentColor,
      size: currentSize,
      qty: 1,

      stock: stockForCurrent,
      image: preview,

      // ✅ 非鞋子不写 heightIncreaseCm（undefined），鞋子才写 number
      heightIncreaseCm: heightForSnapshot,

      category_root_slug: categoryRootSlug ?? "uncategorized",
      category_leaf_slug: categoryLeafSlug ?? null,

      // ✅ SKU
      product_sku: variantSku,
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
    </div>
  );
}
