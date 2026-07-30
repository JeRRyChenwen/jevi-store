// src/lib/analytics/ga4.ts
"use client";

import { sendGAEvent } from "@next/third-parties/google";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

const STORE_AFFILIATION = "JEVI Store Production";
const ITEM_BRAND = "JEVI APPAREL STUDIO";

type CommerceEventName =
  | "view_item"
  | "add_to_cart"
  | "view_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "add_shipping_info";


type CommerceEventExtraParams = {
  shipping_tier?: string;
};

export type Ga4CommerceItemInput = {
  itemId: string;
  itemName: string;
  productSlug: string;

  price: number;
  basePrice?: number | null;
  quantity?: number;

  currency: string;

  color?: string;
  size?: string;
  heightIncreaseCm?: number;

  categoryRootSlug?: string;
  categoryLeafSlug?: string | null;
};

/**
 * Shopping Bag 中保存的商品快照结构。
 *
 * 这里故意使用结构类型，而不是直接依赖 CartItem，
 * 避免 analytics 工具和购物袋组件形成不必要的强耦合。
 */
export type Ga4CartItemSnapshot = {
  slug?: string;
  title?: string;

  price?: number;
  basePrice?: number;
  currency?: string;

  qty?: number;

  color?: string;
  size?: string;
  heightIncreaseCm?: number;

  category_root_slug?: string;
  category_leaf_slug?: string | null;

  sku?: string | null;
  product_sku?: string | null;
  variant_sku?: string | null;
  variantSku?: string | null;
};

function isGa4Enabled(): boolean {
  return (
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID)
  );
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseCurrency(value: unknown): string {
  const currency = cleanText(value).toUpperCase();

  return /^[A-Z]{3}$/.test(currency) ? currency : "AUD";
}

function normaliseMoney(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normaliseQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  return quantity;
}

function formatHeight(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function resolveCartItemId(item: Ga4CartItemSnapshot): string {
  const candidates = [
    item.product_sku,
    item.variant_sku,
    item.variantSku,
    item.sku,
  ];

  for (const candidate of candidates) {
    const value = cleanText(candidate);

    if (value) {
      return value;
    }
  }

  return "";
}

function buildGa4Item(input: Ga4CommerceItemInput) {
  const itemId = cleanText(input.itemId);
  const itemName = cleanText(input.itemName);

  const color = cleanText(input.color);
  const size = cleanText(input.size);

  const categoryRoot = cleanText(input.categoryRootSlug);
  const categoryLeaf = cleanText(input.categoryLeafSlug);

  const price = normaliseMoney(input.price);
  const basePrice = normaliseMoney(input.basePrice);
  const quantity = normaliseQuantity(input.quantity);

  const height =
    typeof input.heightIncreaseCm === "number" &&
    Number.isFinite(input.heightIncreaseCm)
      ? input.heightIncreaseCm
      : null;

  const variantParts = [
    color,
    size ? `EU ${size}` : "",
    height != null ? `+${formatHeight(height)} cm` : "",
  ].filter(Boolean);

  const item: Record<string, string | number> = {
    item_id: itemId,
    item_name: itemName,
    affiliation: STORE_AFFILIATION,
    item_brand: ITEM_BRAND,
    price,
    quantity,
    google_business_vertical: "retail",
  };

  if (categoryRoot) {
    item.item_category = categoryRoot;
  }

  if (categoryLeaf) {
    item.item_category2 = categoryLeaf;
  }

  if (variantParts.length > 0) {
    item.item_variant = variantParts.join(" | ");
  }

  if (basePrice > price) {
    item.discount = normaliseMoney(basePrice - price);
  }

  return item;
}

function isValidCommerceInput(
  input: Ga4CommerceItemInput,
): boolean {
  return (
    Boolean(cleanText(input.itemId)) &&
    Boolean(cleanText(input.itemName)) &&
    normaliseMoney(input.price) > 0 &&
    normaliseQuantity(input.quantity) > 0
  );
}

function sendCommerceItemsEvent(
  eventName: CommerceEventName,
  inputs: Ga4CommerceItemInput[],
  extraParams: CommerceEventExtraParams = {},
): void {
  if (!isGa4Enabled()) {
    return;
  }

  const validInputs = inputs.filter(isValidCommerceInput);

  if (validInputs.length === 0) {
    return;
  }

  const currency = normaliseCurrency(validInputs[0].currency);

  const normalisedInputs = validInputs.map((input) => ({
    ...input,
    currency,
    price: normaliseMoney(input.price),
    quantity: normaliseQuantity(input.quantity),
  }));

  const value = normaliseMoney(
    normalisedInputs.reduce(
      (sum, input) => sum + input.price * input.quantity,
      0,
    ),
  );

  if (value <= 0) {
    return;
  }

  sendGAEvent("event", eventName, {
    ...extraParams,
    currency,
    value,
    items: normalisedInputs.map(buildGa4Item),
  });
}

/**
 * 将 Shopping Bag 中的商品快照转换成统一的 GA4 商品结构。
 *
 * 商品必须包含真实 Variant SKU。
 * 缺少真实 SKU 时跳过该商品，避免使用购物袋内部 key
 * 污染 GA4 的 item_id 和商品报表。
 */
export function cartItemToGa4CommerceInput(
  item: Ga4CartItemSnapshot,
  quantityOverride?: number,
): Ga4CommerceItemInput | null {
  const itemId = resolveCartItemId(item);
  const itemName = cleanText(item.title);
  const productSlug = cleanText(item.slug);

  const price = normaliseMoney(item.price);

  const quantity = normaliseQuantity(
    quantityOverride ?? item.qty,
  );

  if (
    !itemId ||
    !itemName ||
    !productSlug ||
    price <= 0 ||
    quantity <= 0
  ) {
    return null;
  }

  const heightIncreaseCm =
    typeof item.heightIncreaseCm === "number" &&
    Number.isFinite(item.heightIncreaseCm)
      ? item.heightIncreaseCm
      : undefined;

  return {
    itemId,
    itemName,
    productSlug,

    price,
    basePrice:
      typeof item.basePrice === "number"
        ? normaliseMoney(item.basePrice)
        : null,

    quantity,
    currency: normaliseCurrency(item.currency),

    color: cleanText(item.color) || undefined,
    size: cleanText(item.size) || undefined,
    heightIncreaseCm,

    categoryRootSlug:
      cleanText(item.category_root_slug) || "uncategorized",

    categoryLeafSlug:
      cleanText(item.category_leaf_slug) || null,
  };
}

export function trackViewItem(
  input: Ga4CommerceItemInput,
): void {
  sendCommerceItemsEvent("view_item", [
    {
      ...input,
      quantity: 1,
    },
  ]);
}

export function trackAddToCart(
  input: Ga4CommerceItemInput,
): void {
  sendCommerceItemsEvent("add_to_cart", [input]);
}

export function trackViewCart(
  inputs: Ga4CommerceItemInput[],
): void {
  sendCommerceItemsEvent("view_cart", inputs);
}

export function trackRemoveFromCart(
  input: Ga4CommerceItemInput,
): void {
  sendCommerceItemsEvent("remove_from_cart", [input]);
}

export function trackBeginCheckout(
  inputs: Ga4CommerceItemInput[],
): void {
  sendCommerceItemsEvent("begin_checkout", inputs);
}

export function trackAddShippingInfo(
  inputs: Ga4CommerceItemInput[],
  shippingTier: string,
): void {
  const normalisedShippingTier = cleanText(
    shippingTier,
  ).toLowerCase();

  if (!normalisedShippingTier) {
    return;
  }

  sendCommerceItemsEvent(
    "add_shipping_info",
    inputs,
    {
      shipping_tier: normalisedShippingTier,
    },
  );
}