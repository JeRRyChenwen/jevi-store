"use client";

import type { CSSProperties } from "react";
import CardSkeleton from "./CardSkeleton";
import ProductCard from "./ProductCard";

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

export type ProductGridProps = {
  error: string | null;
  loading: boolean;
  list: ProductLite[];

  // pagination calc
  start: number;
  pageSize: number;
  filteredTotal: number;

  // height lock
  sectionMinHeightStyle: CSSProperties;

  // pricing helpers
  displayCurrency: string;
  pickPriceForCurrency: (prices: PriceRec[], currency: string) => PickRes;
  formatPriceForCard: (minor: number, currency: string) => string;
};

export default function ProductGrid({
  error,
  loading,
  list,
  start,
  pageSize,
  filteredTotal,
  sectionMinHeightStyle,
  displayCurrency,
  pickPriceForCurrency,
  formatPriceForCard,
}: ProductGridProps) {
  if (error) {
    return <div className="py-20 text-center text-red-600">{error}</div>;
  }

  if (loading) {
    return (
      <section style={sectionMinHeightStyle}>
        <div className="grid grid-cols-2 gap-3 sm:gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
          {Array.from({ length: Math.min(pageSize, filteredTotal - start) || 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (list.length === 0) {
    return <div className="py-20 text-center text-muted-foreground">No products yet.</div>;
  }

  return (
    <section style={sectionMinHeightStyle}>
      <div className="grid grid-cols-2 gap-3 sm:gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
        {list.map((p, idx) => (
          <ProductCard
            key={p.key}
            p={p}
            idx={idx}
            start={start}
            displayCurrency={displayCurrency}
            pickPriceForCurrency={pickPriceForCurrency}
            formatPriceForCard={formatPriceForCard}
          />
        ))}
      </div>
    </section>
  );
}
