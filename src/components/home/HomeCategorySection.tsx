// src/components/home/HomeCategorySection.tsx
"use client";

import Link from "next/link";
import ProductCard from "@/app/(shop)/category/[slug]/_components/ProductCard";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import {
  pickPriceForCurrency,
  formatPriceForCard,
} from "@/app/(shop)/category/[slug]/_lib/categoryProductMapper";

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

export default function HomeCategorySection({
  title,
  slug,
  products,
  displayCurrency = CURRENT_STOREFRONT.defaultCurrency,
}: {
  title: string;
  slug: string;
  products: ProductLite[];
  displayCurrency?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-neutral-500">
            Top picks based on hot score
          </p>
        </div>

        <Link
          href={`/category/${slug}`}
          className="text-sm font-semibold underline underline-offset-4"
        >
          View all
        </Link>
      </div>

      <div className="px-4 md:px-6 lg:px-8">
        {!products?.length ? (
          <div className="py-10 text-center text-muted-foreground">
            No products yet.
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {products.map((p, idx) => (
              <ProductCard
                key={p.key}
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
      </div>
    </section>
  );
}