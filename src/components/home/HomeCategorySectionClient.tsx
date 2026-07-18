// src/components/home/HomeCategorySectionClient.tsx
"use client";

import Link from "next/link";
import ProductCard from "@/app/(shop)/category/[slug]/_components/ProductCard";
import { CURRENT_STOREFRONT } from "@/lib/market/current";

import { useCategoryProducts } from "@/app/(shop)/category/[slug]/_hooks/useCategoryProducts";
import {
  normalizeProduct,
  pickPriceForCurrency,
  formatPriceForCard,
} from "@/app/(shop)/category/[slug]/_lib/categoryProductMapper";

type Props = {
  slug: string;
  title: string;
  categoryDocIds?: string[];
  pageSize?: number;
  displayCurrency?: string;
};

const toCents = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) : undefined;

export default function HomeCategorySectionClient({
  slug,
  title,
  categoryDocIds,
  pageSize = 5,
  displayCurrency = CURRENT_STOREFRONT.defaultCurrency,
}: Props) {
  const sortQueryString =
    "&sort[0]=hot_score:desc&sort[1]=priority:asc&sort[2]=updatedAt:desc";

  const { loading, list, error } = useCategoryProducts({
    slug,
    categoryDocIds,
    page: 1,
    pageSize,
    sortQueryString,

    appliedGenders: [],
    appliedMaterials: [],
    appliedSizes: [],
    appliedColors: [],

    appliedMin: undefined,
    appliedMax: undefined,

    displayCurrency,
    toCents,
    normalizeProduct,
    devLogPrefix: `HomeSection:${slug}`,
  });

  let displayHeading: string;

  if (slug === "new-in") {
    displayHeading = "News In";
  } else if (slug === "on-sale") {
    displayHeading = "On Sale";
  } else {
    displayHeading = `Top Picks for ${title}`;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {displayHeading}
        </h2>

        <Link
          href={`/category/${slug}`}
          className="text-xs font-medium underline underline-offset-4"
        >
          View all
        </Link>
      </div>

      {error ? (
        <div className="py-6 text-xs text-red-600">
          Failed to load products: {String(error)}
        </div>
      ) : loading ? (
        <div className="py-6 text-xs text-muted-foreground">Loading...</div>
      ) : !list || list.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No products yet.
        </div>
      ) : (
        <div
          className="
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
          "
        >
          {list.map((p: any, idx: number) => (
            <ProductCard
              key={p?.key ?? p?.slug ?? `${slug}-${idx}`}
              p={p}
              idx={idx}
              start={0}
              displayCurrency={displayCurrency}
              pickPriceForCurrency={pickPriceForCurrency}
              formatPriceForCard={formatPriceForCard}
            />
          ))}
        </div>
      )}
    </section>
  );
}
