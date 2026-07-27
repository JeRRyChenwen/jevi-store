// src/app/google-merchant-feed.xml/route.ts

import { createHash } from "node:crypto";

import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { resolveDisplayPrice } from "@/lib/pricing";
import { api } from "@/lib/strapi";

import {
  getCardImagesByColorFromProduct,
  getImagesByColorFromProduct,
  getPrices,
  getVariantMetaList,
  type VariantMeta,
} from "@/app/(shop)/product/[slug]/pdp.utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_ORIGIN = BRAND.siteUrl.replace(/\/+$/, "");

/**
 * Google taxonomy:
 * Apparel & Accessories > Shoes
 */
const GOOGLE_PRODUCT_CATEGORY_ID = "187";

const GOOGLE_PRODUCT_TYPE =
  "Men's Shoes > Height Increasing Shoes";

const INVENTORY_BATCH_SIZE = 25;

type PreparedProduct = {
  title: string;
  slug: string;
  description: string;

  variants: VariantMeta[];

  imagesByColor: Record<string, string[]>;
  cardImagesByColor: Record<string, string>;

  currency: string;
  baseMinor: number;
  effectiveMinor: number;
  saleActive: boolean;
};

function getProductAttributes(row: any) {
  return row?.attributes ?? row ?? {};
}

/**
 * 移除 XML 1.0 不允许的控制字符。
 */
function removeInvalidXmlCharacters(value: unknown): string {
  return String(value ?? "").replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
    "",
  );
}

/**
 * 转义 XML 特殊字符。
 */
function escapeXml(value: unknown): string {
  return removeInvalidXmlCharacters(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlTag(name: string, value: unknown): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function truncateText(value: string, maxLength: number): string {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim();
}

/**
 * 将 Strapi Blocks 转换为纯文本。
 */
function toPlainText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(toPlainText)
      .filter(Boolean)
      .join(" ");
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    if (typeof objectValue.text === "string") {
      return objectValue.text;
    }

    if ("children" in objectValue) {
      return toPlainText(objectValue.children);
    }
  }

  return "";
}

/**
 * 清除旧 description 中的 Markdown 标题和列表前缀，
 * 并压缩多余空白。
 */
function cleanProductDescription(value: unknown): string {
  return toPlainText(value)
    .replace(/(?:^|\s)#{1,6}\s+/g, " ")
    .replace(/(?:^|\s)[*-]\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatColorLabel(value?: string | null): string {
  return String(value || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Google 的商品 ID 最长为 50 个字符。
 *
 * 你的真实 SKU 可能较长，因此：
 * - 保留一部分可读 SKU；
 * - 添加 SKU 的稳定 SHA-256 摘要；
 * - 保证相同 SKU 每次都生成相同 Merchant ID。
 */
function buildMerchantItemId(sku: string): string {
  const normalizedSku = String(sku || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  const readablePart = (normalizedSku || "SKU")
    .slice(0, 33)
    .replace(/^[-_.]+|[-_.]+$/g, "");

  const hash = createHash("sha256")
    .update(sku)
    .digest("hex")
    .slice(0, 10);

  return `JEVI-${readablePart}-${hash}`.slice(0, 50);
}

function buildItemGroupId(slug: string): string {
  const normalizedSlug = String(slug || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  const candidate = `JEVI-${normalizedSlug}`;

  if (candidate.length <= 50) {
    return candidate;
  }

  const hash = createHash("sha256")
    .update(slug)
    .digest("hex")
    .slice(0, 10);

  return `JEVI-${normalizedSlug.slice(0, 33)}-${hash}`.slice(
    0,
    50,
  );
}

function formatMerchantPrice(
  minor: number,
  currency: string,
): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

function buildVariantTitle({
  productTitle,
  colorLabel,
  size,
  height,
}: {
  productTitle: string;
  colorLabel: string;
  size: string;
  height: number;
}): string {
  return truncateText(
    [
      productTitle,
      colorLabel,
      `EU ${size}`,
      `${height} cm Height Increase`,
    ].join(" - "),
    150,
  );
}

function buildVariantUrl({
  slug,
  color,
  size,
  height,
}: {
  slug: string;
  color: string;
  size: string;
  height: number;
}): string {
  const searchParams = new URLSearchParams({
    color,
    size,
    height: String(height),
  });

  return (
    `${SITE_ORIGIN}/product/${encodeURIComponent(slug)}` +
    `?${searchParams.toString()}`
  );
}

async function fetchVisibleProducts(): Promise<any[]> {
  const query =
    `/api/products` +
    `?filters[is_showed][$eq]=true` +
    `&fields[0]=title` +
    `&fields[1]=slug` +
    `&fields[2]=description` +
    `&fields[3]=seo_description` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][card_image]=true` +
    `&populate[color_galleries][populate][images]=true` +
    `&populate[variants][filters][is_showed][$eq]=true` +
    `&populate[variants][fields][0]=color` +
    `&populate[variants][fields][1]=size` +
    `&populate[variants][fields][2]=height_increase_cm` +
    `&populate[variants][fields][3]=sku` +
    `&populate[prices]=*` +
    `&pagination[page]=1` +
    `&pagination[pageSize]=100` +
    `&sort[0]=title:asc` +
    `&publicationState=live`;

  const response: any = await api(query, {
    noCache: true,
  });

  const products = Array.isArray(response?.data)
    ? response.data
    : [];

  if (products.length === 0) {
    throw new Error(
      "Strapi returned zero visible products for the Merchant feed.",
    );
  }

  return products;
}

function getInventoryApiBase(): string {
  const rawBase =
    (process.env.API_PROXY &&
      process.env.API_PROXY.trim()) ||
    (process.env.NEXT_PUBLIC_API_BASE &&
      process.env.NEXT_PUBLIC_API_BASE.trim()) ||
    "";

  const base = rawBase.replace(/\/+$/, "");

  if (!base) {
    throw new Error(
      "API_PROXY or NEXT_PUBLIC_API_BASE is required for the Merchant feed.",
    );
  }

  return base;
}

async function fetchStockBatch(
  base: string,
  skus: string[],
): Promise<Record<string, number>> {
  const uniqueSkus = Array.from(
    new Set(
      skus
        .map((sku) => String(sku || "").trim())
        .filter(Boolean),
    ),
  );

  if (uniqueSkus.length === 0) {
    return {};
  }

  const url =
    `${base}/inventory/bulk?skus=` +
    encodeURIComponent(uniqueSkus.join(","));

  const response = await fetch(url, {
    cache: "no-store",
  });

  const responseText = await response.text();

  let responseJson: any = null;

  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = null;
  }

  if (
    !response.ok ||
    !responseJson?.ok ||
    !responseJson?.stocks ||
    typeof responseJson.stocks !== "object"
  ) {
    throw new Error(
      `Inventory request failed with HTTP ${response.status}.`,
    );
  }

  const output: Record<string, number> = {};

  for (const sku of Object.keys(responseJson.stocks)) {
    const rawStock = Number(responseJson.stocks[sku]);

    output[String(sku)] = Number.isFinite(rawStock)
      ? Math.max(0, Math.floor(rawStock))
      : 0;
  }

  /**
   * Feed 不应在库存接口返回不完整时，
   * 静默把大量商品标记为 out_of_stock。
   *
   * 发生缺失时返回 503，让 Merchant Center 保留之前
   * 成功抓取的数据，并在稍后重试。
   */
  const missingSkus = uniqueSkus.filter((sku) =>
    !Object.prototype.hasOwnProperty.call(output, sku),
  );

  if (missingSkus.length > 0) {
    throw new Error(
      `Inventory response omitted ${missingSkus.length} requested SKU(s).`,
    );
  }

  return output;
}

async function fetchStockBySkus(
  skus: string[],
): Promise<Record<string, number>> {
  const uniqueSkus = Array.from(
    new Set(
      skus
        .map((sku) => String(sku || "").trim())
        .filter(Boolean),
    ),
  );

  if (uniqueSkus.length === 0) {
    throw new Error(
      "No valid SKU was available for the Merchant feed.",
    );
  }

  const base = getInventoryApiBase();
  const output: Record<string, number> = {};

  /**
   * 避免把全部长 SKU 放在单个 GET URL 中，
   * 导致 URL 超长或反向代理拒绝请求。
   */
  for (
    let index = 0;
    index < uniqueSkus.length;
    index += INVENTORY_BATCH_SIZE
  ) {
    const batch = uniqueSkus.slice(
      index,
      index + INVENTORY_BATCH_SIZE,
    );

    const batchStock = await fetchStockBatch(base, batch);

    Object.assign(output, batchStock);
  }

  return output;
}

function buildAdditionalImageTags(
  primaryImage: string,
  candidateImages: string[],
): string[] {
  const uniqueImages = Array.from(
    new Set(
      candidateImages
        .map((url) => String(url || "").trim())
        .filter(Boolean),
    ),
  );

  return uniqueImages
    .filter((url) => url !== primaryImage)
    .slice(0, 10)
    .map((url) =>
      xmlTag("g:additional_image_link", url),
    );
}

function buildVariantOptionXml(
  name: string,
  value: string,
): string {
  return [
    "<g:variant_option>",
    xmlTag("g:name", name),
    xmlTag("g:value", value),
    "</g:variant_option>",
  ].join("");
}

function buildFeedItem({
  product,
  variant,
  stock,
}: {
  product: PreparedProduct;
  variant: VariantMeta & { sku: string };
  stock: number;
}): string {
  const colorLabel = formatColorLabel(variant.color);

  const variantTitle = buildVariantTitle({
    productTitle: product.title,
    colorLabel,
    size: variant.size,
    height: variant.height,
  });

  const variantUrl = buildVariantUrl({
    slug: product.slug,
    color: variant.color,
    size: variant.size,
    height: variant.height,
  });

  const colorImages =
    product.imagesByColor[variant.color] ?? [];

  const cardImage =
    product.cardImagesByColor[variant.color] ?? "";

  /**
   * Gallery 图片优先，因为 pdp.utils 会优先选择 large/medium。
   * card_image 作为没有 Gallery 图片时的回退。
   */
  const primaryImage =
    colorImages[0] || cardImage;

  if (!primaryImage) {
    throw new Error(
      `No image found for ${product.slug}, colour ${variant.color}.`,
    );
  }

  const additionalImages = [
    ...colorImages.slice(1),
    cardImage,
  ];

  const availability =
    stock > 0 ? "in_stock" : "out_of_stock";

  const merchantId = buildMerchantItemId(variant.sku);
  const itemGroupId = buildItemGroupId(product.slug);

  const lines: string[] = [
    "<item>",

    xmlTag("g:id", merchantId),

    xmlTag("title", variantTitle),
    xmlTag("g:item_group_title", product.title),

    xmlTag("description", product.description),

    xmlTag("link", variantUrl),
    xmlTag("g:image_link", primaryImage),

    ...buildAdditionalImageTags(
      primaryImage,
      additionalImages,
    ),

    xmlTag("g:availability", availability),
    xmlTag("g:condition", "new"),

    xmlTag(
      "g:price",
      formatMerchantPrice(
        product.baseMinor,
        product.currency,
      ),
    ),
  ];

  if (
    product.saleActive &&
    product.effectiveMinor > 0 &&
    product.effectiveMinor < product.baseMinor
  ) {
    lines.push(
      xmlTag(
        "g:sale_price",
        formatMerchantPrice(
          product.effectiveMinor,
          product.currency,
        ),
      ),
    );
  }

  lines.push(
    xmlTag("g:brand", BRAND.displayName),

    xmlTag("g:item_group_id", itemGroupId),

    xmlTag(
      "g:google_product_category",
      GOOGLE_PRODUCT_CATEGORY_ID,
    ),

    xmlTag("g:product_type", GOOGLE_PRODUCT_TYPE),

    xmlTag("g:gender", "male"),
    xmlTag("g:age_group", "adult"),

    xmlTag("g:color", colorLabel),
    xmlTag("g:size", variant.size),
    xmlTag("g:size_system", "EU"),

    buildVariantOptionXml(
      "Color",
      colorLabel,
    ),

    buildVariantOptionXml(
      "Size",
      `EU ${variant.size}`,
    ),

    buildVariantOptionXml(
      "Height increase",
      `${variant.height} cm`,
    ),

    "</item>",
  );

  return lines.join("\n");
}

async function prepareProducts(
  rows: any[],
): Promise<PreparedProduct[]> {
  const preparedProducts: PreparedProduct[] = [];

  for (const row of rows) {
    const attributes = getProductAttributes(row);

    const title = String(
      attributes.title || "",
    ).trim();

    const slug = String(
      attributes.slug || "",
    ).trim();

    if (!title || !slug) {
      throw new Error(
        "A visible Strapi product is missing title or slug.",
      );
    }

    const description =
      truncateText(
        cleanProductDescription(attributes.description) ||
          String(
            attributes.seo_description || "",
          ).trim(),
        5000,
      );

    if (!description) {
      throw new Error(
        `${slug} has no usable Merchant description.`,
      );
    }

    const variants = getVariantMetaList(attributes);

    if (variants.length === 0) {
      throw new Error(
        `${slug} has no visible product variants.`,
      );
    }

    for (const variant of variants) {
      if (!variant.sku) {
        throw new Error(
          `${slug} contains a visible variant without an SKU.`,
        );
      }

      if (!variant.color) {
        throw new Error(
          `${slug} contains a visible variant without a colour.`,
        );
      }

      if (!variant.size) {
        throw new Error(
          `${slug} contains a visible variant without a size.`,
        );
      }

      if (
        !Number.isFinite(variant.height) ||
        variant.height <= 0
      ) {
        throw new Error(
          `${slug} contains an invalid height-increase value.`,
        );
      }
    }

    const displayPrice = resolveDisplayPrice(
      getPrices(attributes),
      CURRENT_STOREFRONT.defaultCurrency,
    );

    const currency = String(
      displayPrice.currency || "",
    ).toUpperCase();

    if (currency !== "AUD") {
      throw new Error(
        `${slug} does not have a valid AUD price.`,
      );
    }

    if (
      displayPrice.baseMinor == null ||
      displayPrice.baseMinor <= 0
    ) {
      throw new Error(
        `${slug} has no positive base price.`,
      );
    }

    if (
      displayPrice.effectiveMinor == null ||
      displayPrice.effectiveMinor <= 0
    ) {
      throw new Error(
        `${slug} has no positive effective price.`,
      );
    }

    preparedProducts.push({
      title,
      slug,
      description,
      variants,

      imagesByColor:
        getImagesByColorFromProduct(attributes),

      cardImagesByColor:
        getCardImagesByColorFromProduct(attributes),

      currency,
      baseMinor: displayPrice.baseMinor,
      effectiveMinor: displayPrice.effectiveMinor,
      saleActive: displayPrice.saleActive,
    });
  }

  return preparedProducts;
}

export async function GET() {
  try {
    const productRows = await fetchVisibleProducts();

    const products = await prepareProducts(
      productRows,
    );

    const skuOwners = new Map<string, string>();
    const allSkus: string[] = [];

    for (const product of products) {
      for (const variant of product.variants) {
        const sku = String(variant.sku || "").trim();

        const existingOwner = skuOwners.get(sku);

        if (existingOwner) {
          throw new Error(
            `Duplicate SKU found in ${existingOwner} and ${product.slug}.`,
          );
        }

        skuOwners.set(sku, product.slug);
        allSkus.push(sku);
      }
    }

    const stockBySku = await fetchStockBySkus(
      allSkus,
    );

    const merchantIds = new Set<string>();
    const feedItems: string[] = [];

    for (const product of products) {
      for (const rawVariant of product.variants) {
        const sku = String(
          rawVariant.sku || "",
        ).trim();

        const variant = {
          ...rawVariant,
          sku,
        };

        const merchantId =
          buildMerchantItemId(sku);

        if (merchantIds.has(merchantId)) {
          throw new Error(
            `Duplicate Merchant item ID generated for SKU ${sku}.`,
          );
        }

        merchantIds.add(merchantId);

        if (
          !Object.prototype.hasOwnProperty.call(
            stockBySku,
            sku,
          )
        ) {
          throw new Error(
            `No inventory result was returned for SKU ${sku}.`,
          );
        }

        feedItems.push(
          buildFeedItem({
            product,
            variant,
            stock: stockBySku[sku] ?? 0,
          }),
        );
      }
    }

    if (feedItems.length === 0) {
      throw new Error(
        "The Merchant feed generated zero items.",
      );
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',

      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',

      "<channel>",

      xmlTag(
        "title",
        `${BRAND.displayName} Product Feed`,
      ),

      xmlTag("link", SITE_ORIGIN),

      xmlTag(
        "description",
        `${BRAND.displayName} product data for Google Merchant Center.`,
      ),

      xmlTag(
        "lastBuildDate",
        new Date().toUTCString(),
      ),

      ...feedItems,

      "</channel>",
      "</rss>",
    ].join("\n");

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type":
          "application/rss+xml; charset=utf-8",

        "Cache-Control":
          "no-store, max-age=0",

        "Content-Disposition":
          'inline; filename="google-merchant-feed.xml"',
      },
    });
  } catch (error) {
    console.error(
      "[google-merchant-feed] Generation failed:",
      error,
    );

    return new Response(
      "Merchant feed temporarily unavailable.\n",
      {
        status: 503,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-store, max-age=0",

          "Retry-After": "300",
        },
      },
    );
  }
}