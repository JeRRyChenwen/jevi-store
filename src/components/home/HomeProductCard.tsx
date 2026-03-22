// src/components/home/HomeProductCard.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { normalizeColorName, colorNameToCss } from "@/lib/colors";
import CornerRibbon from "@/components/badges/CornerRibbon"; // ✅ NEW
import HomeImageCarousel from "@/components/home/HomeImageCarousel";

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

  // ✅ NEW：用于 NEW banner 判断（要从 home 的 mapper/接口带出来）
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

// ✅ 判断 NEW 是否生效（跟你 category 里一致）
// - 没有窗口：不显示（更稳）
// - 有 starts/ends：按时间窗口判断
function isNewActive(p: { newStartsAt?: string | null; newEndsAt?: string | null }) {
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

export type HomeProductCardProps = {
  p: ProductLite;
  idx: number;
  start: number;
  displayCurrency: string;

  pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes;
  formatPriceForCard: (minor: number, currency: string) => string;
};

export default function HomeProductCard({
  p,
  idx,
  start,
  displayCurrency,
  pickPriceForCurrency,
  formatPriceForCard,
}: HomeProductCardProps) {
  const router = useRouter();
  const clickStartRef = useRef<{ x: number; y: number } | null>(null);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    p.colors?.[0] ?? null
  );

  // ✅ NEW：是否显示 NEW（只依赖窗口字段，避免对象引用变化导致 useMemo 失效）
  const showNew = useMemo(
    () => isNewActive(p),
    [p.newStartsAt, p.newEndsAt]
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
      : typeof p.price === "number"
      ? formatPriceForCard(
          Math.round(Math.max(0, Number(p.price)) * 100),
          String(p.currency || showCcy || "AUD")
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

    const moved = Math.abs(dx) > 10 || Math.abs(dy) > 10;
    if (moved) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a")) return;

    router.push(`/product/${p.slug}`);
  };

  const handleImagePointerCancel = () => {
    clickStartRef.current = null;
  };

  return (
    <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* 图片区：点击进入详情；拖动时不跳详情 */}
      <div
        className="relative cursor-pointer"
        onPointerDown={handleImagePointerDown}
        onPointerUp={handleImagePointerUp}
        onPointerCancel={handleImagePointerCancel}
      >
        {/* ✅ NEW banner：放在图片容器里 */}
        {showNew && (
          <CornerRibbon
            text="NEW"
            variant="top"
            tone="new"
            height={28}
            className="translate-y-2"
            bannerPulse={true}
            glass={false}
          />
        )}

        <HomeImageCarousel
          urls={urls}
          alt={p.name || `Image #${start + idx + 1}`}
        />
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
