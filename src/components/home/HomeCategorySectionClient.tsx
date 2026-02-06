// src/components/home/HomeCategorySectionClient.tsx
"use client";

import Link from "next/link";

import HomeProductCard from "@/components/home/HomeProductCard";

import { useCategoryProducts } from "@/app/(shop)/category/[slug]/_hooks/useCategoryProducts";
import {
  normalizeProduct,
  pickPriceForCurrency,
  formatPriceForCard,
  formatPriceVal,
  isSaleActiveByLegacy,
  salePriceLegacy,
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
  pageSize = 8,
  displayCurrency = "AUD",
}: Props) {
  // 首页固定 hot 排序
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

    toCents,
    normalizeProduct,
    devLogPrefix: `HomeSection:${slug}`,
  });

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">Top picks based on hot score</p>
        </div>

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
        <div className="py-6 text-center text-xs text-muted-foreground">No products yet.</div>
      ) : (
        <div
          className="
            grid gap-3
            grid-cols-2
            sm:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
          "
        >
          {list.map((p: any, idx: number) => (
            <HomeProductCard
              key={p?.key ?? p?.slug ?? `${slug}-${idx}`}
              p={p}
              idx={idx}
              start={0}
              displayCurrency={displayCurrency}
              pickPriceForCurrency={pickPriceForCurrency as any}
              formatPriceForCard={formatPriceForCard as any}
              formatPriceVal={formatPriceVal as any}
              isSaleActiveByLegacy={isSaleActiveByLegacy as any}
              salePriceLegacy={salePriceLegacy as any}
            />
          ))}
        </div>
      )}
    </section>
  );
}
