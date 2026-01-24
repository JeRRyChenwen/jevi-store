// src/app/product/[slug]/page.tsx
import { notFound } from "next/navigation";
import { api, mediaUrl } from "@/lib/strapi";
import GalleryClient from "../_components/GalleryClient";
import ColorDotsClient from "../_components/ColorDotsClient";
import SizeClient from "../_components/SizeClient";
import AddToBagClient from "../_components/AddToBagClient";
import HeightIncreaseClient from "../_components/HeightIncreaseClient";
import { normalizeColorName, colorNameToCss } from "@/lib/colors";

import { type PriceRec, pickCurrency } from "@/lib/pricing";

/** Next.js 15: params / searchParams 是 Promise，需要 await */
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;

function normalizeColor(s: any) {
  return normalizeColorName(s);
}

function getImagesByColorFromProduct(attrs: any): Record<string, string[]> {
  const arr: any[] = Array.isArray(attrs?.color_galleries)
    ? attrs.color_galleries
    : Array.isArray(attrs?.color_galleries?.data)
    ? attrs.color_galleries.data
    : [];
  const out: Record<string, string[]> = {};

  for (const cg of arr) {
    const colorRaw = (cg?.color ?? cg?.attributes?.color) as string | undefined;
    const color = normalizeColor(colorRaw);
    if (!color) continue;

    const imgs: any[] = Array.isArray(cg?.images?.data)
      ? cg.images.data
      : Array.isArray(cg?.images)
      ? cg.images
      : [];

    const urls: string[] = [];
    for (const im of imgs) {
      const m = im?.attributes ?? im ?? {};
      const u =
        m?.formats?.large?.url ??
        m?.formats?.medium?.url ??
        m?.formats?.small?.url ??
        m?.formats?.thumbnail?.url ??
        m?.url;
      if (typeof u === "string") urls.push(mediaUrl(u));
    }
    if (urls.length) out[color] = urls;
  }
  return out;
}

/**
 * 颜色+尺码+增高 → 库存 / SKU
 * - stock3[color][size][height] = stock
 * - sku3[color][size][height]   = sku (string|null)
 * - sizesSum[color][size] = sum(stock for all heights)
 * - heightSum[color][height] = sum(stock for all sizes)
 * - colorSum[color] = sum(stock for all sizes/heights)
 */
function getStockByColorSizeHeight(attrs: any): {
  stock3: Record<string, Record<string, Record<number, number>>>;
  sku3: Record<string, Record<string, Record<number, string | null>>>;
  sizesSum: Record<string, Record<string, number>>;
  heightSum: Record<string, Record<number, number>>;
  colorSum: Record<string, number>;
} {
  const arr: any[] = Array.isArray(attrs?.variants?.data)
    ? attrs.variants.data
    : Array.isArray(attrs?.variants)
    ? attrs.variants
    : [];

  const stock3: Record<string, Record<string, Record<number, number>>> = {};
  const sku3: Record<string, Record<string, Record<number, string | null>>> = {};
  const sizesSum: Record<string, Record<string, number>> = {};
  const heightSum: Record<string, Record<number, number>> = {};
  const colorSum: Record<string, number> = {};

  for (const v of arr) {
    const a = v?.attributes ?? v ?? {};
    const color = normalizeColor(a.color ?? "");
    const size = String(a.size ?? "").trim();
    if (!color || !size) continue;

    const stock = Number(a.stock) || 0;

    // 允许 0 表示 None
    const h = Number(a.height_increase_cm);
    const height = Number.isFinite(h) ? h : 0;

    // ✅ NEW: sku
    const sku = typeof a.sku === "string" && a.sku.trim() ? a.sku.trim() : null;

    stock3[color] ??= {};
    stock3[color][size] ??= {};
    stock3[color][size][height] = (stock3[color][size][height] ?? 0) + stock;

    sku3[color] ??= {};
    sku3[color][size] ??= {};
    // 同一组合理论上只有一个 sku；如遇到重复，以第一次为准
    if (sku3[color][size][height] == null) {
      sku3[color][size][height] = sku;
    }

    sizesSum[color] ??= {};
    sizesSum[color][size] = (sizesSum[color][size] ?? 0) + stock;

    heightSum[color] ??= {};
    heightSum[color][height] = (heightSum[color][height] ?? 0) + stock;

    colorSum[color] = (colorSum[color] ?? 0) + stock;
  }

  return { stock3, sku3, sizesSum, heightSum, colorSum };
}

function formatPriceVal(n: number | null, currency?: string | null, locale?: string) {
  if (n == null) return "—";
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(Number(n));
}

function isSaleActive(
  discountPercent?: number | null,
  startsAt?: string | null,
  endsAt?: string | null
) {
  const d = Number(discountPercent) || 0;
  if (d <= 0) return false;
  const now = Date.now();
  const startOk = !startsAt || now >= new Date(startsAt).getTime();
  const endOk = !endsAt || now <= new Date(endsAt).getTime();
  return startOk && endOk;
}

function Stars({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${v} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const state = i < full ? "full" : i === full && half ? "half" : "empty";
        return (
          <svg key={i} viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" role="img">
            {state === "half" ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`} x1="0" x2="1">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill={`url(#half-${i})`}
                  stroke="currentColor"
                />
              </>
            ) : (
              <path
                d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill={state === "full" ? "currentColor" : "none"}
                stroke="currentColor"
              />
            )}
          </svg>
        );
      })}
      <span className="ml-1 text-sm text-neutral-600">{v.toFixed(1)}</span>
    </div>
  );
}

function getPrices(attrs: any): PriceRec[] {
  const arr: any[] = Array.isArray(attrs?.prices)
    ? attrs.prices
    : Array.isArray(attrs?.prices?.data)
    ? attrs.prices.data
    : [];

  const out: PriceRec[] = [];
  for (const p of arr) {
    const a = p?.attributes ?? p ?? {};
    const currency = String(a.currency ?? "").toUpperCase();
    if (!currency) continue;

    const amountMinorNum = Number(a.amount_minor);
    const priceNum = Number(a.price);
    const discountNum = Number(a.discount);
    const dpoNum = Number(a.discount_percent_off);

    out.push({
      currency,
      amount_minor: Number.isFinite(amountMinorNum) ? Math.round(amountMinorNum) : undefined,
      price: Number.isFinite(priceNum) ? priceNum : undefined,
      discount: Number.isFinite(discountNum) ? discountNum : undefined,
      discount_percent_off: Number.isFinite(dpoNum) ? dpoNum : undefined,
      sale_starts_at: a.sale_starts_at ?? undefined,
      sale_ends_at: a.sale_ends_at ?? undefined,
    } as PriceRec);
  }
  return out;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Product – ${slug}` };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const qs =
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
    `&fields[4]=discount_percent_off&fields[5]=sale_starts_at&fields[6]=sale_ends_at&fields[7]=hot_score` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true` +
    `&populate[variants][fields][0]=color` +
    `&populate[variants][fields][1]=size` +
    `&populate[variants][fields][2]=stock` +
    `&populate[variants][fields][3]=height_increase_cm` +
    `&populate[variants][fields][4]=sku` + // ✅ NEW: 取 variant sku
    `&populate[prices]=*` +
    `&publicationState=live`;

  const json = await api(qs, { noCache: true });
  const row = json?.data?.[0];
  if (!row) notFound();

  const attrs = row?.attributes ?? row ?? {};
  const title: string = attrs.title ?? attrs.name ?? "Product";

  // ---- pricing ----
  const prices = getPrices(attrs);
  const availableCurrencies = prices.map((r) => r.currency);
  const currencyPicked =
    availableCurrencies.length > 0
      ? pickCurrency(availableCurrencies, { fallback: "AUD" })
      : ((attrs.currency ?? "AUD") as string);

  const rec = prices.find(
    (r) => String(r.currency).toUpperCase() === String(currencyPicked).toUpperCase()
  );

  let baseMinor: number | null = null;
  if (rec) {
    if (
      typeof (rec as any).amount_minor === "number" &&
      Number.isFinite((rec as any).amount_minor)
    ) {
      baseMinor = Math.max(0, Math.round((rec as any).amount_minor));
    } else if (typeof (rec as any).price === "number" && Number.isFinite((rec as any).price)) {
      baseMinor = Math.max(0, Math.round((rec as any).price * 100));
    }
  }

  let effectiveMinor: number | null = baseMinor;
  if (rec && baseMinor != null) {
    const now = Date.now();
    const inWindow = (s?: string, e?: string) => {
      const okS = !s || now >= Date.parse(s);
      const okE = !e || now <= Date.parse(e);
      return okS && okE;
    };
    const s = (rec as any).sale_starts_at;
    const e = (rec as any).sale_ends_at;
    if (inWindow(s, e)) {
      const d = Number((rec as any).discount);
      const off = Number((rec as any).discount_percent_off);
      if (Number.isFinite(d) && d > 0 && d <= 100) {
        effectiveMinor = Math.max(0, Math.round(baseMinor * (d / 100)));
      } else if (Number.isFinite(off) && off > 0 && off < 100) {
        effectiveMinor = Math.max(0, Math.round(baseMinor * (1 - off / 100)));
      }
    }
  }

  const priceFromPrices = baseMinor != null ? baseMinor / 100 : null;
  const effFromPrices = effectiveMinor != null ? effectiveMinor / 100 : null;

  const discountFromPrices =
    baseMinor != null && effectiveMinor != null && effectiveMinor < baseMinor
      ? Math.round((1 - effectiveMinor / baseMinor) * 100)
      : null;

  const cents = Number(attrs.base_price_cents);
  const priceLegacy = Number.isFinite(cents) ? cents / 100 : null;
  const currencyLegacy = (attrs.currency ?? "AUD") as string;
  const discountLegacy = Number(attrs.discount_percent_off) || 0;
  const saleActiveLegacy = isSaleActive(discountLegacy, attrs.sale_starts_at, attrs.sale_ends_at);
  const salePriceLegacy =
    saleActiveLegacy && priceLegacy != null ? priceLegacy * (1 - discountLegacy / 100) : null;

  const currency = (currencyPicked || currencyLegacy) as string;
  const price = priceFromPrices != null ? priceFromPrices : priceLegacy;
  const salePrice =
    effFromPrices != null && priceFromPrices != null && effFromPrices < priceFromPrices
      ? effFromPrices
      : salePriceLegacy;

  const discount =
    discountFromPrices != null
      ? discountFromPrices
      : saleActiveLegacy
      ? Math.round(discountLegacy)
      : 0;

  const saleActive = salePrice != null && price != null && salePrice < price;

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
    css: colorNameToCss(name),
  }));

  // ---- variants stock + sku ----
  const { stock3, sku3, sizesSum, heightSum, colorSum } = getStockByColorSizeHeight(attrs);

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

  // ---- height selection (ALWAYS SHOW) ----
  // URL height：默认 0（None）
  const heightParamRaw = Array.isArray((sp as any).height) ? (sp as any).height[0] : (sp as any).height;
  const parsedHeight = Number(heightParamRaw);
  const heightFromUrl = Number.isFinite(parsedHeight) ? parsedHeight : 0; // ✅ default 0

  // 当前颜色下的“全局可选高度”（跨所有 size 汇总）——保证未选 size 也能点
  const heightsAllForColor = currentColor ? heightSum[currentColor] ?? {} : {};
  const realHeightsAll = Object.keys(heightsAllForColor)
    .map((k) => Number(k))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  // 当已经选了 size：用该 size 下真实存在的 height 做“有效性校验”
  const heightsForCurrentSize =
    currentColor && currentSize ? stock3[currentColor]?.[currentSize] ?? {} : {};

  const realHeightsForSize = Object.keys(heightsForCurrentSize)
    .map((k) => Number(k))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  // ✅ 已选 size 时：0cm 库存优先用 Strapi 的 height=0 variant
  const stockZeroForSize =
    currentColor && currentSize
      ? (stock3[currentColor]?.[currentSize]?.[0] ??
          sizesSum[currentColor]?.[currentSize] ??
          0)
      : 0;

  // Height picker options：
  // - 未选 size：用“当前颜色的 height 汇总库存”来做 stock，确保按钮可点
  // - 已选 size：用“当前 size 的 height 库存”
  const heightOptions =
    currentColor && currentSize
      ? [
          { value: 0, stock: stockZeroForSize }, // ✅ 这里改了：不再用 sizesSum 直接当 0cm
          ...realHeightsForSize.map((h) => ({ value: h, stock: heightsForCurrentSize[h] ?? 0 })),
        ]
      : currentColor
      ? [
          { value: 0, stock: colorSum[currentColor] ?? 0 },
          ...realHeightsAll.map((h) => ({ value: h, stock: heightsAllForColor[h] ?? 0 })),
        ]
      : [{ value: 0, stock: 0 }];

  // 当前有效 height：
  // - 未选 size：只要在 options 里就算有效，否则回 0
  // - 已选 size：必须该 size 下存在，否则回 0（避免下单选到不存在的组合）
  let validHeight = heightFromUrl;
  if (currentColor && currentSize) {
    if (validHeight !== 0 && !realHeightsForSize.includes(validHeight)) validHeight = 0;
  } else {
    if (!heightOptions.some((o) => o.value === validHeight)) validHeight = 0;
  }

  // 当前库存显示（右侧 “In stock” 那行用）
  const stockForCurrent =
    currentColor && currentSize
      ? validHeight === 0
        ? (stock3[currentColor]?.[currentSize]?.[0] ??
            sizesSum[currentColor]?.[currentSize] ??
            0) // ✅ 这里也改了：0cm 优先用真实 0 variant
        : stock3[currentColor]?.[currentSize]?.[validHeight] ?? 0
      : 0;

  // 是否显示 height picker：
  // ✅ 只要该颜色下存在 “>0 的 height 变体”，就一直显示（无论是否选 size）
  const shouldShowHeightPicker = Boolean(currentColor) && realHeightsAll.length > 0;

  return (
    <main className="w-full px-2 sm:px-4 md:px-6 lg:px-0 py-8 overflow-x-hidden">
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
              rounded-3xl border bg-white
              overflow-hidden flex items-center justify-center
              aspect-[3/4] md:aspect-[2/3] lg:aspect-[3/5]
              min-h-[560px] md:min-h-[660px] lg:min-h-[760px] xl:min-h-[840px] 2xl:min-h-[920px]
            "
          >
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
          <div className="space-y-5 px-1 sm:px-2">
            <h2 className="text-2xl font-bold leading-tight">{title}</h2>

            {saleActive ? (
              <div className="space-y-2">
                {discount ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-1">
                    {discount}% OFF
                  </span>
                ) : null}
                <div className="text-sm text-neutral-500 line-through">
                  {formatPriceVal(price, currency)}
                </div>
                <div className="text-xl font-semibold text-emerald-700">
                  {formatPriceVal(salePrice, currency)}
                </div>
              </div>
            ) : (
              <div className="text-xl font-semibold">{formatPriceVal(price, currency)}</div>
            )}

            {colorOptions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-neutral-600 flex items-center gap-2">
                  Colors
                  {currentColor && <span className="text-neutral-800 font-medium">{currentColor}</span>}
                </div>
                <ColorDotsClient options={colorOptions} current={currentColor} slug={slug} />
              </div>
            )}

            <div className="text-neutral-800">
              <Stars value={rating} />
            </div>

            {sizeOptions.length > 0 && (
              <div className="space-y-2">
                <div className="text-base md:text-lg text-neutral-700 flex items-center gap-2">
                  Sizes
                  {currentSize && (
                    <span className="text-neutral-900 font-semibold text-base md:text-lg">
                      {currentSize}
                    </span>
                  )}
                </div>

                <div className="origin-left scale-[1.12] md:scale-[1.18]">
                  <SizeClient options={sizeOptions} current={currentSize} slug={slug} />
                </div>

                <div className="mt-1 text-sm md:text-base">
                  {currentSize ? (
                    stockForCurrent > 0 ? (
                      <span className="text-neutral-600">
                        In stock:{" "}
                        <span className="font-semibold text-neutral-900">{stockForCurrent}</span>
                      </span>
                    ) : (
                      <span className="text-rose-600">Out of stock</span>
                    )
                  ) : (
                    <span className="text-neutral-600">Please select a size</span>
                  )}
                </div>
              </div>
            )}

            {/* ✅ Height picker：永远独立显示（只要该颜色有 height>0 的 variants） */}
            {shouldShowHeightPicker ? (
              <HeightIncreaseClient
                options={heightOptions}
                current={validHeight}
                slug={slug}
                paramKey="height"
              />
            ) : null}

            {/* ✅ ADD TO BAG：永远是 Add to Bag（禁用只取决于 size/stock 等） */}
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
              // ✅ NEW: 把 sku3 也传下去，下一步在 AddToBagClient 写入 bag item
              // 如果 AddToBagClient 暂时还没加 sku3 prop，这里用 ts-expect-error 先压住类型报错
              sku3={sku3}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
