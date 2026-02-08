// D:\前端练习\social-platform\src\app\(shop)\category\[slug]\_components\ProductCard.tsx

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { normalizeColorName, colorNameToCss } from "@/lib/colors";
import ImageCarousel from "./ImageCarousel";
import CornerRibbon from "@/components/badges/CornerRibbon"; // ✅ NEW

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

  // ✅ NEW 字段（来自 normalizeProduct 映射）
  newStartsAt?: string | null;
  newEndsAt?: string | null;

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

// ✅ 判断 NEW 是否生效（有窗口才显示，更稳）
function isNewActive(p: ProductLite) {
  const now = Date.now();
  const s = p.newStartsAt ? Date.parse(p.newStartsAt) : NaN;
  const e = p.newEndsAt ? Date.parse(p.newEndsAt) : NaN;

  const hasS = Number.isFinite(s);
  const hasE = Number.isFinite(e);

  if (!hasS && !hasE) return false;
  if (hasS && now < s) return false;
  if (hasE && now > e) return false;
  return true;
}

export type ProductCardProps = {
  p: ProductLite;
  idx: number;
  start: number;
  displayCurrency: string;

  // 从父组件传入：完全复用原来的逻辑
  pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes;
  formatPriceForCard: (minor: number, currency: string) => string;
  formatPriceVal: (n: number | null, currency?: string | null, locale?: string) => string;

  isSaleActiveByLegacy: (p: ProductLite) => boolean;
  salePriceLegacy: (p: ProductLite) => number;
};

export default function ProductCard({
  p,
  idx,
  start,
  displayCurrency,
  pickPriceForCurrency,
  formatPriceForCard,
  formatPriceVal,
  isSaleActiveByLegacy,
  salePriceLegacy,
}: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(p.colors?.[0] ?? null);

  // ✅ NEW: 是否显示 NEW（依赖写稳：只跟时间窗相关）
  const showNew = useMemo(
    () => isNewActive(p),
    [p.newStartsAt, p.newEndsAt]
  );

  // 热度星级（0~5）
  let stars = p.hotScore ?? 0;
  if (stars > 5) stars = Math.round(clamp(stars, 0, 100) / 20);
  stars = clamp(Math.round(stars), 0, 5);

  // 图片选择
  const colorKey = selectedColor ? normalizeColorName(selectedColor) : null;
  const byColor = colorKey && p.variantsByColor[colorKey];
  const anyColor =
    byColor && byColor.length
      ? byColor
      : (() => {
          for (const arr of Object.values(p.variantsByColor)) {
            if (arr?.length) return arr;
          }
          return [];
        })();
  const urls =
    (byColor && byColor.length ? byColor : anyColor) ||
    (p.imageUrl ? [p.imageUrl] : []);

  // ✅ 选中币种并计算原价/折后价
  const pick = pickPriceForCurrency(p.prices, displayCurrency) || null;

  // 原价（最小货币单位）
  const baseMinor: number | null =
    pick?.base_minor ??
    (typeof p.price === "number" ? Math.round(Math.max(0, p.price) * 100) : null);

  // 折后价（最小货币单位）
  const effectiveMinor: number | null = pick?.effective_minor ?? baseMinor;

  // 折扣百分比（仅当有折扣且小于原价才显示）
  let discountPct: number | null = null;
  if (
    typeof baseMinor === "number" &&
    typeof effectiveMinor === "number" &&
    baseMinor > 0 &&
    effectiveMinor < baseMinor
  ) {
    discountPct = Math.round((1 - effectiveMinor / baseMinor) * 100);
  }

  // 展示字符串
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

  // 旧字段保底（如果没拿到 pick 并且有旧折扣窗口）
  const legacyOnSale = !pick && isSaleActiveByLegacy(p);
  const legacySalePrice = legacyOnSale ? salePriceLegacy(p) : null;

  return (
    <article className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        {/* ✅ NEW banner：放在图片区域 */}
        {showNew && (
          <CornerRibbon
            text="NEW"
            variant="top"
            tone="new"
            height={28}               // ✅ 更矮
            className="translate-y-2" // ✅ 往下移一点
            bannerPulse={true}        // ✅ 关键：打开呼吸闪烁
            glass={false}
          />
        )}

        <ImageCarousel urls={urls} alt={p.name || `Image #${start + idx + 1}`} />

        {p.slug && (
          <Link
            href={`/product/${p.slug}`}
            aria-label={`View ${p.name}`}
            className="absolute inset-0 z-10"
          />
        )}
      </div>

      <div className="p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-semibold line-clamp-1">
          {p.slug ? (
            <Link href={`/product/${p.slug}`} className="hover:underline">
              {p.name || `Product #${start + idx + 1}`}
            </Link>
          ) : (
            p.name || `Product #${start + idx + 1}`
          )}
        </h3>

        {discountPct != null && (
          <p className="mt-1 text-base font-semibold text-emerald-700 uppercase tracking-wide">
            {discountPct}% OFF
          </p>
        )}

        <div className="mt-2">
          {discountPct != null && displayBase ? (
            <div className="flex items-baseline gap-2">
              <span className="text-base text-neutral-400 line-through">{displayBase}</span>
              <span className="text-neutral-300">|</span>
              <span className="text-base font-bold text-emerald-700">{displayEff}</span>
            </div>
          ) : legacyOnSale && legacySalePrice != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-base text-neutral-400 line-through">
                {formatPriceVal(p.price, p.currency)}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-base font-bold text-emerald-700">
                {formatPriceVal(legacySalePrice, p.currency)}
              </span>
            </div>
          ) : (
            <div className="text-base font-bold">{displayEff}</div>
          )}
        </div>

        {p.colors && p.colors.length > 0 && (
          <div className="mt-3 flex items-center gap-2.5">
            {p.colors.slice(0, 8).map((c) => {
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
                    "relative inline-flex h-6 w-6 items-center justify-center rounded-full",
                    active
                      ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white"
                      : "ring-1 ring-black/10 hover:ring-black/30",
                    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
                  ].join(" ")}
                >
                  <span
                    className="block h-6 w-6 rounded-full"
                    style={{ backgroundColor: colorNameToCss(normalized) }}
                  />
                </button>
              );
            })}
            {p.colors.length > 8 && (
              <span className="text-xs text-neutral-500">+{p.colors.length - 8}</span>
            )}
          </div>
        )}

        {p.sizes && p.sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {p.sizes.slice(0, 10).map((sz) => (
              <span
                key={sz}
                className="px-2 py-0.5 rounded-full border text-xs leading-5 bg-white"
                title={`Size ${sz}`}
              >
                {sz}
              </span>
            ))}
            {p.sizes.length > 10 && (
              <span className="text-xs text-neutral-500">+{p.sizes.length - 10}</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i3) => (
            <Star
              key={i3}
              className={
                i3 < (stars as number)
                  ? "h-4 w-4 fill-black text-black"
                  : "h-4 w-4 text-neutral-300"
              }
            />
          ))}
        </div>
      </div>
    </article>
  );
}
