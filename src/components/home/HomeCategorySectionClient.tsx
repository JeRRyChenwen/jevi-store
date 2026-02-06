// src/components/home/HomeCategorySectionClient.tsx
"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import ProductGrid from "@/app/(shop)/category/[slug]/_components/ProductGrid";

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
  // 首页固定 hot 排序（跟你之前首页一致）
  const sortQueryString =
    "&sort[0]=hot_score:desc&sort[1]=priority:asc&sort[2]=updatedAt:desc";

  const { loading, list, error, filteredTotal: filteredTotalFromApi } =
    useCategoryProducts({
      slug,
      categoryDocIds,
      page: 1,
      pageSize,
      sortQueryString,

      // ✅ 关键：这些字段在 hook 类型里不是可选 string[]，不能给 undefined
      appliedGenders: [],
      appliedMaterials: [],
      appliedSizes: [],
      appliedColors: [],

      // ✅ 关键：这里不能给 null，只能 undefined
      appliedMin: undefined,
      appliedMax: undefined,

      toCents,
      normalizeProduct,
      devLogPrefix: `HomeSection:${slug}`,
    });

  // 首页不需要严格 total，这里用 hook 返回的 total，兜底用 list.length
  const filteredTotal =
    Number.isFinite(filteredTotalFromApi) && filteredTotalFromApi > 0
      ? filteredTotalFromApi
      : list?.length ?? 0;

  const sectionMinHeightStyle: CSSProperties = {
    // 首页不需要像分类页那样撑到完整一页，给个轻量高度防止跳动
    minHeight: 480,
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">Top picks based on hot score</p>
        </div>

        <Link
          href={`/category/${slug}`}
          className="text-sm font-medium underline underline-offset-4"
        >
          View all
        </Link>
      </div>

      <ProductGrid
        error={error}
        loading={loading}
        list={list}
        start={0}
        pageSize={pageSize}
        filteredTotal={filteredTotal}
        sectionMinHeightStyle={sectionMinHeightStyle}
        displayCurrency={displayCurrency}
        pickPriceForCurrency={pickPriceForCurrency}
        formatPriceForCard={formatPriceForCard}
        formatPriceVal={formatPriceVal}
        isSaleActiveByLegacy={isSaleActiveByLegacy}
        salePriceLegacy={salePriceLegacy}
      />
    </section>
  );
}
