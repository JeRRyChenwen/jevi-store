// D:\前端练习\jevi-store\src\app\(shop)\category\[slug]\_components\ProductCard.tsx

"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  /** 商品详情完整画廊，兼容旧商品主图兜底 */
  variantsByColor: Record<string, string[]>;

  /** 分类商品卡专用主图：每个颜色对应一张 */
  cardImagesByColor?: Record<string, string>;

  imageUrl?: string;
};

type PickRes = {
  base_minor: number | null;
  effective_minor: number | null;
  currency: string;
} | null;

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

  pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes;
  formatPriceForCard: (minor: number, currency: string) => string;
};

export default function ProductCard({
  p,
  idx,
  start,
  displayCurrency,
  pickPriceForCurrency,
  formatPriceForCard,
}: ProductCardProps) {
  const router = useRouter();
  const clickStartRef = useRef<{ x: number; y: number } | null>(null);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    p.colors?.[0] ?? null,
  );

  // ✅ NEW: 是否显示 NEW（依赖写稳：只跟时间窗相关）
  const showNew = useMemo(() => isNewActive(p), [p.newStartsAt, p.newEndsAt]);

  // 热度星级（0~5）
  let stars = p.hotScore ?? 0;
  if (stars > 5) stars = Math.round(clamp(stars, 0, 100) / 20);
  stars = clamp(Math.round(stars), 0, 5);

  // 商品卡图片选择：每种颜色只显示一张 card_image
  const colorKey = selectedColor ? normalizeColorName(selectedColor) : null;

  // 为图片 alt 保留 Strapi 中原始、可读的颜色名称。
  // selectedColor 在点击后可能已经被 normalizeColorName() 标准化，
  // 因此这里重新从 p.colors 中找到对应的原始名称。
  const selectedColorLabel = useMemo(() => {
    if (!selectedColor) return null;

    const selectedKey = normalizeColorName(selectedColor);

    const matchingColor = p.colors?.find(
      (color) => normalizeColorName(color) === selectedKey,
    );

    const label = String(matchingColor || selectedColor).trim();
    return label || null;
  }, [p.colors, selectedColor]);

  const productDisplayName = p.name || `Product #${start + idx + 1}`;

  const cardImageAlt = selectedColorLabel
    ? `${productDisplayName} in ${selectedColorLabel}`
    : productDisplayName;

  /**
   * 兜底顺序：
   * 1. 当前颜色的 card_image
   * 2. 当前颜色完整画廊中的第一张
   * 3. 任意颜色的 card_image
   * 4. 任意颜色完整画廊中的第一张
   * 5. Product 默认 imageUrl
   */
  let cardImageUrl: string | undefined;

  if (colorKey) {
    cardImageUrl = p.cardImagesByColor?.[colorKey];

    if (!cardImageUrl) {
      cardImageUrl = p.variantsByColor?.[colorKey]?.[0];
    }
  }

  if (!cardImageUrl) {
    for (const url of Object.values(p.cardImagesByColor ?? {})) {
      if (url) {
        cardImageUrl = url;
        break;
      }
    }
  }

  if (!cardImageUrl) {
    for (const galleryImages of Object.values(p.variantsByColor ?? {})) {
      if (galleryImages?.[0]) {
        cardImageUrl = galleryImages[0];
        break;
      }
    }
  }

  if (!cardImageUrl) {
    cardImageUrl = p.imageUrl;
  }

  // ImageCarousel 只收到一张图，因此不会显示箭头、圆点或轮播
  const cardUrls = cardImageUrl ? [cardImageUrl] : [];

  // ✅ 选中币种并计算原价/折后价
  const pick = pickPriceForCurrency(p.prices, displayCurrency) || null;

  // 原价（最小货币单位）
  const baseMinor: number | null =
    pick?.base_minor ??
    (typeof p.price === "number"
      ? Math.round(Math.max(0, p.price) * 100)
      : null);

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
    typeof baseMinor === "number"
      ? formatPriceForCard(baseMinor, showCcy)
      : null;

  const displayEff =
    typeof effectiveMinor === "number"
      ? formatPriceForCard(effectiveMinor, showCcy)
      : typeof p.price === "number"
        ? formatPriceForCard(
            Math.round(Math.max(0, Number(p.price)) * 100),
            String(p.currency || showCcy || displayCurrency),
          )
        : "No price";

  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    clickStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleImagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!p.slug) return;

    const startPoint = clickStartRef.current;
    clickStartRef.current = null;

    if (!startPoint) return;

    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;

    // ✅ 位移很小才当作“点击进入详情”；否则当作拖动，不跳转
    const moved = Math.abs(dx) > 10 || Math.abs(dy) > 10;
    if (moved) return;

    // ✅ 如果点到按钮/可交互元素，不在这里跳
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a")) return;

    router.push(`/product/${p.slug}`);
  };

  const handleImagePointerCancel = () => {
    clickStartRef.current = null;
  };

  return (
    <article className="group overflow-hidden rounded-2xl sm:rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div
        className="relative cursor-pointer"
        onPointerDown={handleImagePointerDown}
        onPointerUp={handleImagePointerUp}
        onPointerCancel={handleImagePointerCancel}
      >
        {/* ✅ NEW banner：放在图片区域 */}
        {showNew && (
          <CornerRibbon
            text="NEW"
            variant="top"
            tone="new"
            height={22}
            className="translate-y-1 sm:translate-y-2"
            bannerPulse={true}
            glass={false}
          />
        )}

        <ImageCarousel urls={cardUrls} alt={cardImageAlt} />
      </div>

      <div className="p-3 sm:p-6 md:p-8">
        <h3 className="text-sm sm:text-lg md:text-xl font-semibold leading-snug line-clamp-2 sm:line-clamp-1 min-h-[2.5rem] sm:min-h-0">
          {p.slug ? (
            <Link href={`/product/${p.slug}`} className="hover:underline">
              {p.name || `Product #${start + idx + 1}`}
            </Link>
          ) : (
            p.name || `Product #${start + idx + 1}`
          )}
        </h3>

        {discountPct != null && (
          <p className="mt-1 text-xs sm:text-base font-semibold text-emerald-700 uppercase tracking-wide">
            {discountPct}% OFF
          </p>
        )}

        <div className="mt-1.5 sm:mt-2">
          {discountPct != null && displayBase ? (
            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
              <span className="text-xs sm:text-base text-neutral-400 line-through">
                {displayBase}
              </span>
              <span className="text-neutral-300 text-xs sm:text-base">|</span>
              <span className="text-sm sm:text-base font-bold text-emerald-700">
                {displayEff}
              </span>
            </div>
          ) : (
            <div className="text-sm sm:text-base font-bold">{displayEff}</div>
          )}
        </div>

        {p.colors && p.colors.length > 0 && (
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2.5">
            {p.colors.slice(0, 8).map((c) => {
              const normalized = normalizeColorName(c);
              const active = normalizeColorName(selectedColor) === normalized;
              return (
                <button
                  key={normalized}
                  type="button"
                  title={c}
                  aria-label={`Show ${productDisplayName} in ${c}`}
                  aria-pressed={active}
                  onClick={() => setSelectedColor(normalized)}
                  className={[
                    "relative inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full",
                    active
                      ? "ring-2 ring-neutral-900 ring-offset-1 sm:ring-offset-2 ring-offset-white"
                      : "ring-1 ring-black/10 hover:ring-black/30",
                    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
                  ].join(" ")}
                >
                  <span
                    className="block h-5 w-5 sm:h-6 sm:w-6 rounded-full"
                    style={{ backgroundColor: colorNameToCss(normalized) }}
                  />
                </button>
              );
            })}
            {p.colors.length > 8 && (
              <span className="text-xs text-neutral-500">
                +{p.colors.length - 8}
              </span>
            )}
          </div>
        )}

        {p.sizes && p.sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {p.sizes.slice(0, 10).map((sz) => (
              <span
                key={sz}
                className="px-1.5 sm:px-2 py-0.5 rounded-full border text-[11px] sm:text-xs leading-4 sm:leading-5 bg-white"
                title={`Size ${sz}`}
              >
                {sz}
              </span>
            ))}
            {p.sizes.length > 10 && (
              <span className="text-xs text-neutral-500">
                +{p.sizes.length - 10}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 sm:mt-3 flex items-center gap-0.5 sm:gap-1">
          {Array.from({ length: 5 }).map((_, i3) => (
            <Star
              key={i3}
              className={
                i3 < (stars as number)
                  ? "h-3.5 w-3.5 sm:h-4 sm:w-4 fill-black text-black"
                  : "h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-300"
              }
            />
          ))}
        </div>
      </div>
    </article>
  );
}
