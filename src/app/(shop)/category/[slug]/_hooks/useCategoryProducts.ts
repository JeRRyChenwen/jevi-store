// src/app/(shop)/category/[slug]/_hooks/useCategoryProducts.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/strapi";

type PriceRec = any;

export type UseCategoryProductsArgs = {
  slug: string;
  categoryDocIds?: string[];

  page: number;
  pageSize: number;
  sortQueryString: string;

  appliedMin?: number;
  appliedMax?: number;
  appliedGenders: string[];
  appliedMaterials: string[];
  appliedSizes: string[];
  appliedColors: string[];

  toCents: (n?: number | null) => number | undefined;
  normalizeProduct: (row: any) => any;

  devLogPrefix?: string;
};

const PROMO_SLUGS = new Set(["new-in", "on-sale"]);
const isPromoSlug = (slug: string) => PROMO_SLUGS.has(slug);

function buildPromoProductFilters(slug: string, nowISO: string): string[] {
  const parts: string[] = [];

  if (slug === "on-sale") {
    parts.push(`filters[sale_starts_at][$notNull]=true`);
    parts.push(`filters[sale_starts_at][$lte]=${encodeURIComponent(nowISO)}`);
    parts.push(`filters[$or][0][sale_ends_at][$null]=true`);
    parts.push(`filters[$or][1][sale_ends_at][$gte]=${encodeURIComponent(nowISO)}`);
    return parts;
  }

  if (slug === "new-in") {
    parts.push(`filters[new_starts_at][$notNull]=true`);
    parts.push(`filters[new_starts_at][$lte]=${encodeURIComponent(nowISO)}`);
    parts.push(`filters[$or][0][new_ends_at][$null]=true`);
    parts.push(`filters[$or][1][new_ends_at][$gte]=${encodeURIComponent(nowISO)}`);
    return parts;
  }

  return parts;
}

export function useCategoryProducts({
  slug,
  categoryDocIds,
  page,
  pageSize,
  sortQueryString,
  appliedMin,
  appliedMax,
  appliedGenders,
  appliedMaterials,
  appliedSizes,
  appliedColors,
  toCents,
  normalizeProduct,
  devLogPrefix = "Products",
}: UseCategoryProductsArgs) {
  const DEV = process.env.NODE_ENV !== "production";
  const dbg = (...args: unknown[]) => DEV && console.debug(`[${devLogPrefix}]`, ...args);

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);

  const categoryKey = useMemo(
    () => JSON.stringify(categoryDocIds ?? []),
    [categoryDocIds]
  );
  const gendersKey = useMemo(() => appliedGenders.join(","), [appliedGenders]);
  const materialsKey = useMemo(() => appliedMaterials.join(","), [appliedMaterials]);
  const sizesKey = useMemo(() => appliedSizes.join(","), [appliedSizes]);
  const colorsKey = useMemo(() => appliedColors.join(","), [appliedColors]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const parts: string[] = [];
        const promo = isPromoSlug(slug);

        // ✅ 分类：promo 聚合页不按 category 过滤
        if (!promo) {
          if (categoryDocIds?.length) {
            categoryDocIds.forEach((id, i) =>
              parts.push(
                `filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`
              )
            );
          } else {
            parts.push(`filters[category][slug][$eq]=${encodeURIComponent(slug)}`);
          }
        } else {
          // promo：加 sale/new 时间窗口过滤
          const nowISO = new Date().toISOString();
          parts.push(...buildPromoProductFilters(slug, nowISO));
        }

        // 仅展示「被上架显示」的商品
        parts.push(`filters[is_showed][$eq]=true`);

        // 价格区间过滤：暂时禁用（保持你现状）
        const minCents = toCents(appliedMin);
        const maxCents = toCents(appliedMax);
        if (typeof minCents === "number" || typeof maxCents === "number") {
          dbg("price range filter is temporarily disabled:", { minCents, maxCents });
        }

        // product 级（gender）
        if (appliedGenders.length) {
          appliedGenders.forEach((v, i) =>
            parts.push(`filters[gender][$in][${i}]=${encodeURIComponent(v)}`)
          );
        }

        // variant 级（material / size）
        const pushIN = (key: string, arr: string[]) => {
          arr.forEach((v, i) =>
            parts.push(
              `filters[variants][${key}][$in][${i}]=${encodeURIComponent(v)}`
            )
          );
        };

        // color：OR + containsi
        const pushColorORContainsI = (colors: string[]) => {
          colors
            .map((v) => String(v || "").trim())
            .filter(Boolean)
            .forEach((v, i) => {
              parts.push(
                `filters[$or][${i}][variants][color][$containsi]=${encodeURIComponent(v)}`
              );
            });
        };

        if (appliedMaterials.length) pushIN("material", appliedMaterials);
        if (appliedSizes.length) pushIN("size", appliedSizes);
        if (appliedColors.length) pushColorORContainsI(appliedColors);

        const qs =
          `/api/products?${parts.join("&")}` +
          `&fields[0]=title&fields[1]=slug` +
          `&fields[2]=sale_starts_at&fields[3]=sale_ends_at&fields[4]=hot_score&fields[5]=priority` +
          `&fields[6]=new_starts_at&fields[7]=new_ends_at` +
          `&populate[color_galleries][fields][0]=color` +
          `&populate[color_galleries][populate][images]=true` +
          `&populate[variants][fields][0]=color&populate[variants][fields][1]=size` +
          `&populate[prices]=*` +
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `${sortQueryString}&publicationState=live`;

        dbg("products:GET", qs);

        const json = await api(qs, { noCache: true });
        const rows: any[] = Array.isArray(json?.data) ? json.data : [];
        const totalMeta = Number(json?.meta?.pagination?.total ?? 0);

        if (!aborted) {
          setFilteredTotal(totalMeta || 0);
          setList(rows.map(normalizeProduct));
        }
      } catch (e: any) {
        if (!aborted) {
          setError(e?.message || "Failed to load products");
          setList([]);
          setFilteredTotal(0);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [
    slug,
    categoryKey,
    page,
    pageSize,
    appliedMin,
    appliedMax,
    gendersKey,
    materialsKey,
    sizesKey,
    colorsKey,
    sortQueryString,
  ]);

  return { loading, list, error, filteredTotal };
}
