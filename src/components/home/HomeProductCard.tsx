// D:\前端练习\social-platform\src\components\home\HomeProductCard.tsx

import Link from "next/link";
import { Star } from "lucide-react";

type HomeProductCardProps = {
  slug: string;
  title: string;
  imageUrl?: string | null;

  priceText: string;      // e.g. "AUD 99.00"
  saleText?: string | null; // e.g. "AUD 79.00"
  discountPct?: number | null;

  hotScore?: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function HomeProductCard({
  slug,
  title,
  imageUrl,
  priceText,
  saleText,
  discountPct,
  hotScore,
}: HomeProductCardProps) {
  // 热度转 0~5 星
  let stars = hotScore ?? 0;
  if (stars > 5) stars = Math.round(clamp(stars, 0, 100) / 20);
  stars = clamp(Math.round(stars), 0, 5);

  return (
    <article className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <div className="aspect-[4/5] w-full bg-neutral-50 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">
              No image
            </div>
          )}
        </div>

        <Link
          href={`/product/${slug}`}
          aria-label={`View ${title}`}
          className="absolute inset-0"
        />
      </div>

      <div className="p-5 md:p-6">
        <h3 className="text-base md:text-lg font-semibold line-clamp-1">
          <Link href={`/product/${slug}`} className="hover:underline">
            {title}
          </Link>
        </h3>

        {discountPct != null && discountPct > 0 ? (
          <p className="mt-1 text-sm font-semibold text-emerald-700 uppercase tracking-wide">
            {discountPct}% OFF
          </p>
        ) : null}

        <div className="mt-2">
          {saleText ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-neutral-400 line-through">{priceText}</span>
              <span className="text-neutral-300">|</span>
              <span className="text-sm font-bold text-emerald-700">{saleText}</span>
            </div>
          ) : (
            <div className="text-sm font-bold">{priceText}</div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={
                i < stars
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
