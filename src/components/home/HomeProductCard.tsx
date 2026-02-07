// src/components/home/HomeProductCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeColorName, colorNameToCss } from "@/lib/colors";

// 不依赖对方导出的类型，避免类型导出不一致时报错
type PriceRec = any;

type ProductLite = {
  key: string;
  slug?: string;
  name: string;

  prices: PriceRec[];
  price: number | null;
  currency?: string | null;

  discountPercent?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  hotScore?: number | null;

  colors?: string[];
  sizes?: string[];
  variantsByColor: Record<string, string[]>;
  imageUrl?: string;
};

type PickRes =
  | { base_minor: number | null; effective_minor: number | null; currency: string }
  | null;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export type HomeProductCardProps = {
  p: ProductLite;
  idx: number;
  start: number;
  displayCurrency: string;

  // 复用分类页同款定价逻辑
  pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes;
  formatPriceForCard: (minor: number, currency: string) => string;
  formatPriceVal: (n: number | null, currency?: string | null, locale?: string) => string;

  isSaleActiveByLegacy: (p: ProductLite) => boolean;
  salePriceLegacy: (p: ProductLite) => number;
};

export default function HomeProductCard({
  p,
  idx,
  start,
  displayCurrency,
  pickPriceForCurrency,
  formatPriceForCard,
  formatPriceVal,
  isSaleActiveByLegacy,
  salePriceLegacy,
}: HomeProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(
    p.colors?.[0] ?? null
  );

  // 热度星级（0~5）
  let stars = p.hotScore ?? 0;
  if (stars > 5) stars = Math.round(clamp(stars, 0, 100) / 20);
  stars = clamp(Math.round(stars), 0, 5);

  // 图片选择：按颜色取变体图，取不到就用任意颜色第一组，最后 fallback imageUrl
  const urls = useMemo(() => {
    const colorKey = selectedColor ? normalizeColorName(selectedColor) : null;
    const byColor = colorKey && p.variantsByColor?.[colorKey];

    const anyColor =
      byColor && byColor.length
        ? byColor
        : (() => {
            for (const arr of Object.values(p.variantsByColor || {})) {
              if (arr?.length) return arr;
            }
            return [];
          })();

    const picked =
      (byColor && byColor.length ? byColor : anyColor) ||
      (p.imageUrl ? [p.imageUrl] : []);

    return Array.isArray(picked) ? picked.filter(Boolean) : [];
  }, [p.imageUrl, p.variantsByColor, selectedColor]);

  // ✅ 选中币种并计算原价/折后价
  const pick = pickPriceForCurrency(p.prices, displayCurrency) || null;

  // 原价（minor）
  const baseMinor: number | null =
    pick?.base_minor ??
    (typeof p.price === "number" ? Math.round(Math.max(0, p.price) * 100) : null);

  // 折后价（minor）
  const effectiveMinor: number | null = pick?.effective_minor ?? baseMinor;

  // 折扣百分比
  let discountPct: number | null = null;
  if (
    typeof baseMinor === "number" &&
    typeof effectiveMinor === "number" &&
    baseMinor > 0 &&
    effectiveMinor < baseMinor
  ) {
    discountPct = Math.round((1 - effectiveMinor / baseMinor) * 100);
  }

  const showCcy = pick?.currency || displayCurrency;

  const displayBase =
    typeof baseMinor === "number" ? formatPriceForCard(baseMinor, showCcy) : null;

  const displayEff =
    typeof effectiveMinor === "number"
      ? formatPriceForCard(effectiveMinor, showCcy)
      : p.price != null
      ? formatPriceForCard(
          Math.round(Number(p.price) * 100),
          (p.currency || showCcy || "AUD") as string
        )
      : "No price";

  // 旧字段保底（如果没拿到 pick）
  const legacyOnSale = !pick && isSaleActiveByLegacy(p);
  const legacySalePrice = legacyOnSale ? salePriceLegacy(p) : null;

  // ====== 主页专用：更“贴底”的轮播，减少图片下方留白 ======
  const [imgIdx, setImgIdx] = useState(0);
  const count = urls.length;

  useEffect(() => {
    setImgIdx(0);
  }, [urls.join("|")]);

  const go = (delta: number) => {
    if (!count) return;
    setImgIdx((i) => (i + delta + count) % count);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* 图片区：用固定比例撑开，并让图片 object-bottom（贴底），最大化减少下方留白 */}
      <div className="relative">
        <div className="relative aspect-[4/5] w-full bg-muted overflow-hidden">
          {count ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urls[imgIdx]}
              alt={p.name || `Image #${start + idx + 1}`}
              className="absolute inset-0 h-full w-full object-cover object-bottom"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No Image
            </div>
          )}

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 hover:bg-white shadow p-1 z-20"
              >
                <ChevronLeft className="h-4 w-4 text-neutral-800" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 hover:bg-white shadow p-1 z-20"
              >
                <ChevronRight className="h-4 w-4 text-neutral-800" />
              </button>
            </>
          )}
        </div>

        {p.slug ? (
          <Link
            href={`/product/${p.slug}`}
            aria-label={`View ${p.name}`}
            className="absolute inset-0 z-10"
          />
        ) : null}
      </div>

      {/* 白色信息区：更紧凑 */}
      <div className="px-3 py-2.5">
        {/* 标题 */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-1">
          {p.slug ? (
            <Link href={`/product/${p.slug}`} className="hover:underline">
              {p.name || `Product #${start + idx + 1}`}
            </Link>
          ) : (
            p.name || `Product #${start + idx + 1}`
          )}
        </h3>

        {/* 折扣 */}
        {discountPct != null ? (
          <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
            {discountPct}% OFF
          </p>
        ) : null}

        {/* 价格 */}
        <div className="mt-1">
          {discountPct != null && displayBase ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-neutral-400 line-through">
                {displayBase}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-[12px] font-bold text-emerald-700">
                {displayEff}
              </span>
            </div>
          ) : legacyOnSale && legacySalePrice != null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-neutral-400 line-through">
                {formatPriceVal(p.price, p.currency)}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-[12px] font-bold text-emerald-700">
                {formatPriceVal(legacySalePrice, p.currency)}
              </span>
            </div>
          ) : (
            <div className="text-[12px] font-bold">{displayEff}</div>
          )}
        </div>

        {/* 颜色：更小 */}
        {p.colors && p.colors.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5">
            {p.colors.slice(0, 6).map((c) => {
              const normalized = normalizeColorName(c);
              const active = normalizeColorName(selectedColor) === normalized;
              return (
                <button
                  key={normalized}
                  type="button"
                  title={c}
                  aria-pressed={active}
                  onClick={() => setSelectedColor(normalized)}
                  className={[
                    "relative inline-flex h-4 w-4 items-center justify-center rounded-full",
                    active
                      ? "ring-2 ring-neutral-900 ring-offset-1 ring-offset-white"
                      : "ring-1 ring-black/10 hover:ring-black/30",
                    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
                  ].join(" ")}
                >
                  <span
                    className="block h-4 w-4 rounded-full"
                    style={{ backgroundColor: colorNameToCss(normalized) }}
                  />
                </button>
              );
            })}
            {p.colors.length > 6 ? (
              <span className="text-[10px] text-neutral-500">
                +{p.colors.length - 6}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 尺码：更小、更少 */}
        {p.sizes && p.sizes.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {p.sizes.slice(0, 8).map((sz) => (
              <span
                key={sz}
                className="px-1.5 py-0.5 rounded-full border text-[10px] leading-4 bg-white"
                title={`Size ${sz}`}
              >
                {sz}
              </span>
            ))}
            {p.sizes.length > 8 ? (
              <span className="text-[10px] text-neutral-500">
                +{p.sizes.length - 8}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 星级：更小 */}
        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i3) => (
            <Star
              key={i3}
              className={
                i3 < (stars as number)
                  ? "h-3.5 w-3.5 fill-black text-black"
                  : "h-3.5 w-3.5 text-neutral-300"
              }
            />
          ))}
        </div>
      </div>
    </article>
  );
}
