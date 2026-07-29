// src/lib/analytics/ga4.ts
"use client";

import { sendGAEvent } from "@next/third-parties/google";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

const STORE_AFFILIATION = "JEVI Store Production";
const ITEM_BRAND = "JEVI APPAREL STUDIO";

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
  const quantity = Math.floor(Number(value) || 1);

  return Math.max(1, quantity);
}

function formatHeight(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function buildGa4Item(input: Ga4CommerceItemInput) {
  const itemId = cleanText(input.itemId);
  const itemName = cleanText(input.itemName);
  const productSlug = cleanText(input.productSlug);

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

  if (productSlug) {
    item.item_list_id = `product_${productSlug}`;
    item.item_list_name = "Product detail page";
  }

  return item;
}

function sendCommerceEvent(
  eventName: "view_item" | "add_to_cart",
  input: Ga4CommerceItemInput,
): void {
  if (!isGa4Enabled()) {
    return;
  }

  const itemId = cleanText(input.itemId);
  const itemName = cleanText(input.itemName);
  const price = normaliseMoney(input.price);

  if (!itemId || !itemName || price <= 0) {
    return;
  }

  const quantity = normaliseQuantity(input.quantity);
  const currency = normaliseCurrency(input.currency);

  sendGAEvent("event", eventName, {
    currency,
    value: normaliseMoney(price * quantity),
    items: [
      buildGa4Item({
        ...input,
        currency,
        price,
        quantity,
      }),
    ],
  });
}

export function trackViewItem(
  input: Ga4CommerceItemInput,
): void {
  sendCommerceEvent("view_item", {
    ...input,
    quantity: 1,
  });
}

export function trackAddToCart(
  input: Ga4CommerceItemInput,
): void {
  sendCommerceEvent("add_to_cart", input);
}