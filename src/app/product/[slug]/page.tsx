// src/app/product/[slug]/page.tsx
import { notFound } from "next/navigation";
import { api, mediaUrl } from "@/lib/strapi";
import GalleryClient from "../_components/GalleryClient";
import ColorDotsClient from "../_components/ColorDotsClient";
import SizeClient from "../_components/SizeClient";
import AddToBagClient from "../_components/AddToBagClient";
import { normalizeColorName, colorNameToCss } from "@/lib/colors";

import {
  type PriceRec,
  pickCurrency,
  effectiveMinor,
  minorToMajor,
} from "@/lib/pricing";

/** Next.js 15: params / searchParams 是 Promise，需要 await */
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;

/** 标准化颜色字符串（沿用你已有规则） */
function normalizeColor(s: any) {
  return normalizeColorName(s);
}

/** 从 product.color_galleries 里取 “颜色 -> 图片数组” */
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

/** 颜色+尺码 → 库存 */
function getStockByColorSize(attrs: any): Record<string, Record<string, number>> {
  const arr: any[] = Array.isArray(attrs?.variants?.data)
    ? attrs.variants.data
    : Array.isArray(attrs?.variants)
    ? attrs.variants
    : [];
  const out: Record<string, Record<string, number>> = {};
  for (const v of arr) {
    const a = v?.attributes ?? v ?? {};
    const color = normalizeColor(a.color ?? "");
    const size = String(a.size ?? "").trim();
    if (!color || !size) continue;
    const stock = Number(a.stock) || 0;
    out[color] ??= {};
    out[color][size] = (out[color][size] ?? 0) + stock;
  }
  return out;
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

/** 是否在促销窗口内（旧字段回退用） */
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

/** 评分星星（0~5，支持半星） */
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

/** ✅ 从 Strapi attributes 解析 Price 组件数组（与分类页一致） */
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
    const amount_minor = Number(a.price); // 你的 Price 组件里字段名是 price（最小货币单位）
    if (!currency || !Number.isInteger(amount_minor)) continue;

    const rec: PriceRec = {
      currency: currency as any,
      amount_minor,
      discount_percent_off:
        typeof a.discount_percent_off === "number" ? a.discount_percent_off : undefined,
      sale_starts_at: a.sale_starts_at ?? undefined,
      sale_ends_at: a.sale_ends_at ?? undefined,
    };
    out.push(rec);
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
    `&populate[prices][fields][0]=currency` +
    `&populate[prices][fields][1]=price` +
    `&populate[prices][fields][2]=discount_percent_off` +
    `&populate[prices][fields][3]=sale_starts_at` +
    `&populate[prices][fields][4]=sale_ends_at` +
    `&publicationState=live`;

  const json = await api(qs, { noCache: true });
  const row = json?.data?.[0];
  if (!row) notFound();

  const attrs = row?.attributes ?? row ?? {};
  const title: string = attrs.title ?? attrs.name ?? "Product";

  // ✅ 新价格：优先使用 Price 组件
  const prices = getPrices(attrs);
  const availableCurrencies = prices.map((r) => r.currency);
  const currencyPicked =
    availableCurrencies.length > 0
      ? pickCurrency(availableCurrencies, { fallback: "AUD" })
      : ((attrs.currency ?? "AUD") as string);

  const rec = prices.find((r) => r.currency === currencyPicked);
  const minorBase = rec?.amount_minor;
  const minorEff = rec ? effectiveMinor(rec) : undefined;

  // 转成主货币“数字”给 UI/购物袋使用
  const priceFromPrices =
    typeof minorBase === "number" ? Number(minorToMajor(minorBase, currencyPicked as any)) : null;
  const effFromPrices =
    typeof minorEff === "number" ? Number(minorToMajor(minorEff, currencyPicked as any)) : null;

  // 折扣百分比（由 Price 组件实时算，避免 100% 错）
  const discountFromPrices =
    typeof minorBase === "number" &&
    typeof minorEff === "number" &&
    minorEff < minorBase
      ? Math.round((1 - minorEff / minorBase) * 100)
      : null;

  // ⛳️ 旧字段（仅作为兜底）
  const cents = Number(attrs.base_price_cents);
  const priceLegacy = Number.isFinite(cents) ? cents / 100 : null;
  const currencyLegacy = (attrs.currency ?? "AUD") as string;
  const discountLegacy = Number(attrs.discount_percent_off) || 0;
  const saleActiveLegacy = isSaleActive(discountLegacy, attrs.sale_starts_at, attrs.sale_ends_at);
  const salePriceLegacy =
    saleActiveLegacy && priceLegacy != null ? priceLegacy * (1 - discountLegacy / 100) : null;

  // === 最终用于展示/下单的金额 ===
  const currency = (currencyPicked || currencyLegacy) as string;
  const price = priceFromPrices != null ? priceFromPrices : priceLegacy; // 基础价（主货币）
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

  // 颜色 -> 图片
  const byColor = getImagesByColorFromProduct(attrs);
  const colorKeys = Object.keys(byColor);

  // 颜色+尺码 -> 库存
  const stockMap = getStockByColorSize(attrs);

  // URL color
  const colorParamRaw = Array.isArray(sp.color) ? sp.color[0] : sp.color;
  const colorParam = normalizeColor(colorParamRaw);
  const currentColor = colorKeys.find((k) => k === colorParam) ?? colorKeys[0] ?? undefined;

  // 当前颜色的图片（没有颜色则扁平化所有图）
  let images: string[] = [];
  if (currentColor) {
    images = byColor[currentColor] ?? [];
  } else {
    const seen = new Set<string>();
    for (const k of colorKeys) {
      for (const u of byColor[k]) if (!seen.has(u)) seen.add(u);
    }
    images = Array.from(seen);
  }
  const total = images.length;

  // 当前选中索引（?img=）
  let selected = 0;
  const rawIdx = Array.isArray(sp.img) ? sp.img[0] : sp.img;
  const n = Number(rawIdx);
  if (Number.isFinite(n) && n >= 0 && n < total) selected = n;

  // 评分（用 hot_score 0~5）
  const rating = Math.max(0, Math.min(5, Number(attrs.hot_score) || 0));

  // 颜色圆点数据（给 ColorDotsClient 传 css）
  const colorOptions = colorKeys.map((name) => ({
    name,
    css: colorNameToCss(name),
  }));

  // ====== 基于当前颜色计算尺码 & 库存 ======
  const sizesForColor = currentColor ? Object.keys(stockMap[currentColor] ?? {}) : [];

  const sizeParamRaw = Array.isArray(sp.size) ? sp.size[0] : sp.size;
  const currentSize =
    typeof sizeParamRaw === "string" && sizesForColor.includes(sizeParamRaw)
      ? sizeParamRaw
      : undefined;

  const sizeOptions = sizesForColor.map((s) => ({
    value: s,
    stock: stockMap[currentColor!]?.[s] ?? 0,
  }));

  const stockForCurrent =
    currentColor && currentSize ? stockMap[currentColor]?.[currentSize] ?? 0 : 0;

  const saleActive = salePrice != null && price != null && salePrice < price;

  return (
    // ✅ 关键：剪掉页面横向溢出，避免出现横向滚动条
    <main className="w-full px-2 sm:px-4 md:px-6 lg:px-0 py-8 overflow-x-hidden">
      <h1 className="sr-only">{title}</h1>

      {/* 3 列：左缩略图 / 中放大图 / 右信息 —— 右栏稍窄，让主视图更宽 */}
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
        {/* 左：小画廊 */}
        <aside className="order-2 lg:order-1 md:sticky md:top-24 self-start md:pr-0">
          <GalleryClient
            images={images}
            title={title}
            slug={slug}
            selectedIndex={selected}
            color={currentColor}
          />
        </aside>

        {/* 中：主视图（更高更宽） */}
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

        {/* 右：信息栏（保持无边框） */}
        <section className="order-3 lg:order-3 lg:pl-20 xl:pl-24 2xl:pl-20 lg:sticky lg:top-12 self-start overflow-x-clip">
          <div className="space-y-5 px-1 sm:px-2">
            <h2 className="text-2xl font-bold leading-tight">{title}</h2>

            {/* 价格区（优先 Price 组件的实时结果） */}
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

            {/* 颜色（可点击切换） */}
            {colorOptions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-neutral-600 flex items-center gap-2">
                  Colors
                  {currentColor && (
                    <span className="text-neutral-800 font-medium">{currentColor}</span>
                  )}
                </div>
                <ColorDotsClient options={colorOptions} current={currentColor} slug={slug} />
              </div>
            )}

            {/* 评分（Popularity） */}
            <div className="text-neutral-800">
              <Stars value={rating} />
            </div>

            {/* 尺码（放到评分下面） */}
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
                        <span className="font-semibold text-neutral-900">
                          {stockForCurrent}
                        </span>
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

            {/* ADD TO BAG + 右侧抽屉购物袋 */}
            <AddToBagClient
              slug={slug}
              title={title}
              price={price ?? null}
              salePrice={saleActive ? (salePrice ?? null) : null}
              currency={currency}
              imagesByColor={byColor}
              stockMap={stockMap}
              fallbackColor={currentColor}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
