// src/app/product/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/strapi";
import GalleryClient from "../_components/GalleryClient";
import AddToBagClient from "../_components/AddToBagClient";
import { colorNameToCss } from "@/lib/colors";
import { FieldMessage } from "@/components/ui/field-message";
import { resolveDisplayPrice } from "@/lib/pricing";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import { isNewProduct } from "@/lib/productNew";
import CornerRibbon from "@/components/badges/CornerRibbon";

import ProductMeta from "../_components/ProductMeta";
import Stars from "../_components/Stars";

import {
  getImagesByColorFromProduct,
  getVariantMetaList,
  getStockByColorSizeHeightFromD1,
  formatPriceVal,
  getPrices,
  extractCategory,
  normalizeColor,
} from "./pdp.utils";

/** Next.js 15: params / searchParams 是 Promise，需要 await */
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;

/**
 * PDP inventory display thresholds
 *
 * CRITICAL_STOCK_THRESHOLD:
 * - When stock is at or below this number, show exact quantity:
 *   "Only X left"
 *
 * LOW_STOCK_THRESHOLD:
 * - When stock is above CRITICAL threshold but at or below this number,
 *   show:
 *   "Low stock"
 *
 * Above LOW_STOCK_THRESHOLD:
 * - Show:
 *   "In stock"
 *
 * How to change later:
 * - Want "Only X left" for 3 or fewer? change CRITICAL_STOCK_THRESHOLD to 3
 * - Want "Low stock" up to 15? change LOW_STOCK_THRESHOLD to 15
 */
const CRITICAL_STOCK_THRESHOLD = 10;
const LOW_STOCK_THRESHOLD = 20;

/**
 * ✅ 从 D1 worker 获取库存（统一用 /inventory/bulk）
 * 返回：{ [sku]: stock }
 */
async function fetchStockBySkus(skus: string[]): Promise<Record<string, number>> {
  const uniq = Array.from(new Set(skus.map((s) => String(s || "").trim()).filter(Boolean)));
  if (!uniq.length) {
    console.log("[PDP][INV] fetchStockBySkus: empty skus");
    return {};
  }

  const baseRaw =
    (process.env.API_PROXY && process.env.API_PROXY.trim()) ||
    (process.env.NEXT_PUBLIC_API_BASE && process.env.NEXT_PUBLIC_API_BASE.trim()) ||
    "";

  const base = baseRaw.replace(/\/+$/, "");
  if (!base) {
    console.log("[PDP][INV] missing API base. baseRaw =", baseRaw);
    return {};
  }

  const url = `${base}/inventory/bulk?skus=${encodeURIComponent(uniq.join(","))}`;

  console.log("[PDP][INV] baseRaw =", baseRaw);
  console.log("[PDP][INV] base =", base);
  console.log("[PDP][INV] url =", url);
  console.log("[PDP][INV] skuCount =", uniq.length, "sample =", uniq.slice(0, 5));

  try {
    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();
    console.log("[PDP][INV] status =", r.status, r.statusText);
    console.log("[PDP][INV] raw body (first 500) =", text.slice(0, 500));

    const j: any = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })();

    if (!r.ok || !j?.ok || typeof j?.stocks !== "object" || !j?.stocks) {
      console.log("[PDP][INV] invalid response json =", j);
      return {};
    }

    const out: Record<string, number> = {};
    for (const sku of Object.keys(j.stocks)) {
      const n = Number(j.stocks[sku]);
      out[String(sku)] = Number.isFinite(n) ? Math.floor(n) : 0;
    }

    for (const s of uniq) if (!(s in out)) out[s] = 0;

    const maxSku = Object.keys(out)[0];
    console.log("[PDP][INV] parsed stocks count =", Object.keys(out).length);
    console.log("[PDP][INV] sample stock =", maxSku ? { sku: maxSku, stock: out[maxSku] } : null);

    return out;
  } catch (e: any) {
    console.log("[PDP][INV] fetch error =", e?.message || String(e));
    return {};
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Product – ${slug}` };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  console.log("[PDP] render start slug =", slug);
  console.log("[PDP] searchParams =", sp);

  // ✅ Strapi 只取 meta（不信任 stock），但我们仍然取 sku/color/size/height
  const qs =
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=title&fields[1]=slug&fields[2]=hot_score` +
    `&fields[3]=new_starts_at&fields[4]=new_ends_at` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true` +
    `&populate[variants][fields][0]=color` +
    `&populate[variants][fields][1]=size` +
    `&populate[variants][fields][3]=height_increase_cm` +
    `&populate[variants][fields][4]=sku` +
    `&populate[prices]=*` +
    `&populate[category][fields][0]=slug` +
    `&populate[category][fields][1]=name` +
    `&populate[category][populate][parent][fields][0]=slug` +
    `&populate[category][populate][parent][fields][1]=name` +
    `&publicationState=live`;

  console.log("[PDP] strapi qs =", qs);

  const json = await api(qs, { noCache: true });
  const row = json?.data?.[0];
  if (!row) notFound();

  const attrs = row?.attributes ?? row ?? {};
  const title: string = attrs.title ?? attrs.name ?? "Product";
  const isNew = isNewProduct(attrs);

  // 面包屑
  const category = extractCategory(attrs);
  const categorySlug = category?.slug;
  const categoryLabel = category?.label;
  const categoryRootSlug = category?.parentSlug ? category.parentSlug : category?.slug;
  const categoryLeafSlug = category?.parentSlug ? (category?.slug ?? null) : null;

  // ---- pricing (STOREFRONT-driven) ----
  const prices = getPrices(attrs);

  const displayPrice = resolveDisplayPrice(
    prices,
    CURRENT_STOREFRONT.defaultCurrency
  );

  const currency = displayPrice.currency;
  const baseMinor = displayPrice.baseMinor;
  const effectiveMinor = displayPrice.effectiveMinor;
  const discount = displayPrice.discountPercent;
  const saleActive = displayPrice.saleActive;

  const price = baseMinor != null ? baseMinor / 100 : null;
  const salePrice =
    saleActive &&
    baseMinor != null &&
    effectiveMinor != null &&
    effectiveMinor < baseMinor
      ? effectiveMinor / 100
      : null;

  // ---- media / colors ----
  const byColor = getImagesByColorFromProduct(attrs);
  const colorKeys = Object.keys(byColor);

  const colorParamRaw = Array.isArray(sp.color) ? sp.color[0] : sp.color;
  const colorParam = normalizeColor(colorParamRaw);
  const currentColor = colorKeys.find((k) => k === colorParam) ?? colorKeys[0] ?? undefined;

  let images: string[] = [];
  if (currentColor) {
    images = byColor[currentColor] ?? [];
  } else {
    const seen = new Set<string>();
    for (const k of colorKeys) for (const u of byColor[k] ?? []) seen.add(u);
    images = Array.from(seen);
  }
  const total = images.length;

  let selected = 0;
  const rawIdx = Array.isArray(sp.img) ? sp.img[0] : sp.img;
  const idxNum = Number(rawIdx);
  if (Number.isFinite(idxNum) && idxNum >= 0 && idxNum < total) selected = idxNum;

  const rating = Math.max(0, Math.min(5, Number(attrs.hot_score) || 0));

  const colorOptions = colorKeys.map((name) => ({
    name,
    css: colorNameToCss(name) ?? "#000000",
  }));

  // ✅ variants meta（来自 Strapi） + stock（来自 D1）
  const variantMeta = getVariantMetaList(attrs);

  console.log("[PDP][variants] count =", variantMeta.length);
  console.log("[PDP][variants] sample =", variantMeta.slice(0, 5));
  console.log(
    "[PDP][variants] sku null ratio =",
    variantMeta.filter((v) => !v.sku).length,
    "/",
    variantMeta.length
  );

  const skus = variantMeta.map((v) => v.sku).filter((s): s is string => Boolean(s));
  console.log("[PDP][INV] skus (count/sample) =", skus.length, skus.slice(0, 5));

  const stockBySku = await fetchStockBySkus(skus);

  console.log("[PDP][INV] stockBySku keys =", Object.keys(stockBySku).length);
  console.log("[PDP][INV] stockBySku sample =", Object.entries(stockBySku).slice(0, 5));

  // ---- variants stock + sku (computed from D1) ----
  const { stock3, sku3, sizesSum, heightSum, colorSum } =
    getStockByColorSizeHeightFromD1(variantMeta, stockBySku);

  console.log("[PDP][AGG] currentColor =", currentColor);
  console.log("[PDP][AGG] sizesSum keys =", currentColor ? Object.keys(sizesSum[currentColor] ?? {}) : []);
  console.log(
    "[PDP][AGG] sizesSum for currentColor =",
    currentColor ? sizesSum[currentColor] : null
  );

  const sizesForColor = currentColor ? Object.keys(sizesSum[currentColor] ?? {}) : [];

  const sizeParamRaw = Array.isArray(sp.size) ? sp.size[0] : sp.size;
  const currentSize =
    typeof sizeParamRaw === "string" && sizesForColor.includes(sizeParamRaw)
      ? sizeParamRaw
      : undefined;

  const sizeOptions = sizesForColor.map((s) => ({
    value: s,
    stock: sizesSum[currentColor!]?.[s] ?? 0,
  }));

  console.log("[PDP][UI] sizeOptions =", sizeOptions);

  // ---- height selection ----
  const heightParamRaw = Array.isArray((sp as any).height)
    ? (sp as any).height[0]
    : (sp as any).height;
  const parsedHeight = Number(heightParamRaw);
  const heightFromUrl = Number.isFinite(parsedHeight) ? parsedHeight : 0;

  const heightsAllForColor = currentColor ? heightSum[currentColor] ?? {} : {};
  const realHeightsAll = Object.keys(heightsAllForColor)
    .map((k) => Number(k))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  const heightsForCurrentSize =
    currentColor && currentSize ? stock3[currentColor]?.[currentSize] ?? {} : {};

  const realHeightsForSize = Object.keys(heightsForCurrentSize)
    .map((k) => Number(k))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  const stockZeroForSize =
    currentColor && currentSize
      ? (stock3[currentColor]?.[currentSize]?.[0] ??
          sizesSum[currentColor]?.[currentSize] ??
          0)
      : 0;

  const heightOptions =
    currentColor && currentSize
      ? [
          { value: 0, stock: stockZeroForSize },
          ...realHeightsForSize.map((h) => ({ value: h, stock: heightsForCurrentSize[h] ?? 0 })),
        ]
      : currentColor
      ? [
          { value: 0, stock: colorSum[currentColor] ?? 0 },
          ...realHeightsAll.map((h) => ({ value: h, stock: heightsAllForColor[h] ?? 0 })),
        ]
      : [{ value: 0, stock: 0 }];

  let validHeight = heightFromUrl;
  if (currentColor && currentSize) {
    if (validHeight !== 0 && !realHeightsForSize.includes(validHeight)) validHeight = 0;
  } else {
    if (!heightOptions.some((o) => o.value === validHeight)) validHeight = 0;
  }

  const stockForCurrent =
    currentColor && currentSize
      ? validHeight === 0
        ? (stock3[currentColor]?.[currentSize]?.[0] ??
            sizesSum[currentColor]?.[currentSize] ??
            0)
        : stock3[currentColor]?.[currentSize]?.[validHeight] ?? 0
      : 0;

  console.log("[PDP][UI] currentSize =", currentSize, "validHeight =", validHeight, "stockForCurrent =", stockForCurrent);

  const shouldShowHeightPicker = Boolean(currentColor) && realHeightsAll.length > 0;

  return (
    <main className="w-full px-2 sm:px-4 md:px-6 lg:px-0 py-8 overflow-x-hidden">
      <nav className="flex items-center text-sm text-neutral-500 mb-4" aria-label="Breadcrumb">
        <Link
          href="/"
          className="font-medium text-neutral-700 hover:text-neutral-900 hover:underline visited:text-neutral-700"
        >
          Home
        </Link>

        <ChevronRight className="mx-1 h-4 w-4 text-neutral-400" />

        {categorySlug ? (
          <Link
            href={`/category/${categorySlug}`}
            className="font-medium text-neutral-700 hover:text-neutral-900 hover:underline visited:text-neutral-700"
          >
            {categoryLabel ?? "Category"}
          </Link>
        ) : (
          <span className="font-medium text-neutral-700">Category</span>
        )}

        <ChevronRight className="mx-1 h-4 w-4 text-neutral-400" />

        <span className="font-semibold text-neutral-900">{title}</span>
      </nav>

      <h1 className="sr-only">{title}</h1>

      <div
        className="
          grid grid-cols-1
          md:[grid-template-columns:max-content_minmax(0,1fr)]
          lg:[grid-template-columns:max-content_minmax(0,1fr)_480px]
          xl:[grid-template-columns:max-content_minmax(0,1fr)_520px]
          2xl:[grid-template-columns:max-content_minmax(0,1fr)_560px]
          gap-y-10 md:gap-x-6 lg:gap-x-10 xl:gap-x-12 2xl:gap-x-16
        "
      >
        <aside className="order-2 lg:order-1 md:sticky md:top-24 self-start md:pr-0">
          <GalleryClient
            images={images}
            title={title}
            slug={slug}
            selectedIndex={selected}
            color={currentColor}
          />
        </aside>

        <section className="order-1 lg:order-2 min-w-0">
          <div
            className="
              relative
              rounded-3xl border bg-white
              overflow-hidden flex items-center justify-center
              aspect-[3/4] md:aspect-[2/3] lg:aspect-[3/5]
              min-h-[560px] md:min-h-[660px] lg:min-h-[760px] xl:min-h-[840px] 2xl:min-h-[920px]
            "
          >
            {isNew ? (
              <CornerRibbon variant="top" text="NEW" tone="new" height={50} className="top-2" />
            ) : null}

            {total > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={images[selected]}
                src={images[selected]}
                alt={title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-neutral-500">No Image</div>
            )}
          </div>
        </section>

        <section className="order-3 lg:order-3 lg:pl-20 xl:pl-24 2xl:pl-20 lg:sticky lg:top-12 self-start overflow-x-clip">
          <div className="px-1 sm:px-2">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold leading-snug tracking-tight">{title}</h2>

              <div className="text-neutral-800">
                <Stars value={rating} />
              </div>

              {saleActive ? (
                <div className="space-y-2">
                  {discount ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 w-fit">
                      {discount}% OFF
                    </span>
                  ) : null}

                  <div className="flex items-baseline gap-3">
                    <div className="text-sm text-neutral-500 line-through">
                      {formatPriceVal(price, currency)}
                    </div>
                    <div className="text-xl font-semibold text-emerald-700">
                      {formatPriceVal(salePrice, currency)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xl font-semibold">{formatPriceVal(price, currency)}</div>
              )}
            </div>

            <div className="my-6 h-px bg-neutral-200" />

            <ProductMeta
              slug={slug}
              colorOptions={colorOptions}
              currentColor={currentColor}
              sizeOptions={sizeOptions}
              currentSize={currentSize}
              shouldShowHeightPicker={shouldShowHeightPicker}
              heightOptions={heightOptions}
              validHeight={validHeight}
            />

            <div className="mt-6 space-y-3">
              <div className="rounded-lg border bg-neutral-50 px-3 py-2">
                {currentSize ? (
                  /*
                    ============================================================
                    Inventory display rules (PDP stock indicator)

                    Only show exact numbers when inventory is very low.
                    This avoids exposing full inventory while still giving
                    urgency signals when stock is limited.

                    Rules:

                    stock <= 0                              → Out of stock
                    stock 1 ~ CRITICAL_STOCK_THRESHOLD      → Only X left
                    stock above CRITICAL and <= LOW_STOCK   → Low stock
                    stock > LOW_STOCK_THRESHOLD             → In stock

                    If user hasn't selected a size yet:
                    → "Please select a size"

                    NOTE:
                    To change thresholds later, edit ONLY these constants
                    near the top of this file:

                    - CRITICAL_STOCK_THRESHOLD
                    - LOW_STOCK_THRESHOLD
                    ============================================================
                  */

                  stockForCurrent <= 0 ? (
                    /* No inventory available */
                    <div className="flex items-start justify-between gap-3">
                      <FieldMessage variant="muted">Availability</FieldMessage>
                      <div className="text-right">
                        <div className="text-sm font-medium text-neutral-800">
                          Out of stock
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          We’re restocking as quickly as possible.
                        </div>
                      </div>
                    </div>

                  ) : stockForCurrent <= CRITICAL_STOCK_THRESHOLD ? (
                    /* Extremely low stock → show exact remaining quantity */
                    <div className="flex items-center justify-between gap-3">
                      <FieldMessage variant="muted">Availability</FieldMessage>
                      <div className="text-sm text-amber-700">
                        Only{" "}
                        <span className="font-semibold text-amber-800">
                          {stockForCurrent}
                        </span>{" "}
                        left
                      </div>
                    </div>

                  ) : stockForCurrent <= LOW_STOCK_THRESHOLD ? (
                    /* Low inventory but not critical → no exact number */
                    <div className="flex items-center justify-between gap-3">
                      <FieldMessage variant="muted">Availability</FieldMessage>
                      <div className="text-sm font-medium text-amber-700">
                        Low stock
                      </div>
                    </div>

                  ) : (
                    /* Inventory is healthy */
                    <div className="flex items-center justify-between gap-3">
                      <FieldMessage variant="muted">Availability</FieldMessage>
                      <div className="text-sm font-medium text-neutral-700">
                        In stock
                      </div>
                    </div>
                  )
                ) : (
                  /* User has not selected a size yet */
                  <FieldMessage variant="muted">Please select a size</FieldMessage>
                )}
              </div>

              <AddToBagClient
                slug={slug}
                title={title}
                price={price ?? null}
                salePrice={saleActive ? (salePrice ?? null) : null}
                currency={currency}
                imagesByColor={byColor}
                stockMap={sizesSum}
                fallbackColor={currentColor}
                heightIncreaseCm={validHeight}
                stock3={stock3}
                sku3={sku3}
                categoryRootSlug={categoryRootSlug ?? "uncategorized"}
                categoryLeafSlug={categoryLeafSlug ?? null}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}