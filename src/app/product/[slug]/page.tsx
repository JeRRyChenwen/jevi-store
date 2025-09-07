// src/app/product/[slug]/page.tsx
import { notFound } from "next/navigation";
import { api, mediaUrl } from "@/lib/strapi";
import GalleryClient from "../_components/GalleryClient";
import ColorDotsClient from "../_components/ColorDotsClient";
import {
  normalizeColorName as normalizeColor,
  colorNameToCss,
} from "@/lib/colors";

/** Next.js 15: params / searchParams 是 Promise，需要 await */
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Product – ${slug}` };
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

function formatPriceVal(
  n: number | null,
  currency?: string | null,
  locale?: string
) {
  if (n == null) return "—";
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(Number(n));
}

/** 是否在促销窗口内 */
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

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const qs =
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
    `&fields[4]=discount_percent_off&fields[5]=sale_starts_at&fields[6]=sale_ends_at&fields[7]=hot_score` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true` +
    `&publicationState=live`;

  const json = await api(qs, { noCache: true });
  const row = json?.data?.[0];
  if (!row) notFound();

  const attrs = row?.attributes ?? row ?? {};

  const title: string = attrs.title ?? attrs.name ?? "Product";
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? cents / 100 : null;
  const currency = (attrs.currency ?? "AUD") as string;

  // 促销
  const discount = Number(attrs.discount_percent_off) || 0;
  const saleActive = isSaleActive(
    discount,
    attrs.sale_starts_at,
    attrs.sale_ends_at
  );
  const salePrice =
    saleActive && price != null ? price * (1 - discount / 100) : null;

  // 颜色 -> 图片
  const byColor = getImagesByColorFromProduct(attrs);
  const colorKeys = Object.keys(byColor);

  // URL color
  const colorParamRaw = Array.isArray(sp.color) ? sp.color[0] : sp.color;
  const colorParam = normalizeColor(colorParamRaw);
  const currentColor =
    colorKeys.find((k) => k === colorParam) ?? colorKeys[0] ?? undefined;

  // 当前颜色的图片（没有颜色则扁平化所有图）
  let images: string[] = [];
  if (currentColor) {
    images = byColor[currentColor] ?? [];
  } else {
    const seen = new Set<string>();
    for (const k of colorKeys) for (const u of byColor[k]) if (!seen.has(u)) seen.add(u);
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

  // 颜色圆点：用公共 colorNameToCss，确保和分类页一致
  const colorOptions = colorKeys.map((name) => ({
    name,
    css: colorNameToCss(name) || "#ddd",
  }));

  return (
    <main className="w-full px-2 sm:px-4 md:px-6 lg:px-0 py-8">
      <h1 className="sr-only">{title}</h1>

      {/* 3 列：左缩略图 / 中放大图 / 右信息（小屏堆叠） */}
      <div
        className="
          grid grid-cols-1
          md:[grid-template-columns:max-content_minmax(0,1fr)]
          lg:[grid-template-columns:max-content_minmax(0,1fr)_520px]
          xl:[grid-template-columns:max-content_minmax(0,1fr)_600px]
          gap-y-10 gap-x-0
        "
      >
        {/* 左：小画廊 */}
        <aside className="order-2 lg:order-1 md:sticky md:top-24 self-start md:pr-0">
          <GalleryClient
            images={images}
            title={title}
            slug={slug}
            selectedIndex={selected}
            // ✅ 保留当前颜色，切换缩略图不会丢 color
            color={currentColor}
          />
        </aside>

        {/* 中：大图 */}
        <section className="order-1 lg:order-2 min-w-0">
          <div className="rounded-3xl border bg-white aspect-[4/3] md:aspect-[5/3] overflow-hidden flex items-center justify-center">
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

        {/* 右：信息栏 */}
        <section className="order-3 lg:order-3 lg:pl-8 xl:pl-10 lg:sticky lg:top-24 self-start">
          <div className="space-y-5">
            <h2 className="text-2xl font-bold leading-tight">{title}</h2>

            {/* 价格区 */}
            {saleActive && salePrice != null ? (
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-1">
                  {discount}% OFF
                </span>
                <div className="text-sm text-neutral-500 line-through">
                  {formatPriceVal(price, currency)}
                </div>
                <div className="text-xl font-semibold text-emerald-700">
                  {formatPriceVal(salePrice, currency)}
                </div>
              </div>
            ) : (
              <div className="text-xl font-semibold">
                {formatPriceVal(price, currency)}
              </div>
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
                <ColorDotsClient
                  options={colorOptions}
                  current={currentColor}
                  slug={slug}
                />
              </div>
            )}

            {/* 评分 */}
            <div className="text-neutral-800">
              <Stars value={rating} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
