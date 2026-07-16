// src/app/(shop)/category/[slug]/_hooks/useCategoryFacets.ts
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/strapi";
import { normalizeColorName } from "@/lib/colors";

const SIZE_ORDER: Record<string, number> = {
  xxs: 0,
  xs: 1,
  s: 2,
  m: 3,
  l: 4,
  xl: 5,
  xxl: 6,
  xxxl: 7,
};

function sortSizes(arr: string[]) {
  return arr.slice().sort((a, b) => {
    const aa = a.trim().toLowerCase();
    const bb = b.trim().toLowerCase();
    const oa = SIZE_ORDER[aa];
    const ob = SIZE_ORDER[bb];
    if (oa != null && ob != null) return oa - ob;
    const na = parseFloat(String(aa));
    const nb = parseFloat(String(bb));
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return aa.localeCompare(bb);
  });
}

type UseCategoryFacetsArgs = {
  slug: string;
  categoryDocIds?: string[];
  displayCurrency: string;
  devLogPrefix?: string;

  virtualFilter?: unknown;
};

const PROMO_SLUGS = new Set(["new-in", "on-sale"]);
const isPromoSlug = (slug: string) => PROMO_SLUGS.has(slug);

function buildPromoFiltersForProducts(
  slug: string,
  nowISO: string,
  currencyCode: string
): string[] {
  const parts: string[] = [];

  if (slug === "on-sale") {
    const currency = String(currencyCode || "AUD").trim().toUpperCase();

    parts.push(
      `filters[$and][0][prices][currency][$eq]=${encodeURIComponent(currency)}`
    );
    parts.push(
      `filters[$and][0][prices][sale_starts_at][$notNull]=true`
    );
    parts.push(
      `filters[$and][0][prices][sale_starts_at][$lte]=${encodeURIComponent(nowISO)}`
    );
    parts.push(
      `filters[$and][0][$or][0][prices][sale_ends_at][$null]=true`
    );
    parts.push(
      `filters[$and][0][$or][1][prices][sale_ends_at][$gte]=${encodeURIComponent(
        nowISO
      )}`
    );

    return parts;
  }

  if (slug === "new-in") {
    parts.push(`filters[new_starts_at][$notNull]=true`);
    parts.push(`filters[new_starts_at][$lte]=${encodeURIComponent(nowISO)}`);
    parts.push(`filters[$or][0][new_ends_at][$null]=true`);
    parts.push(
      `filters[$or][1][new_ends_at][$gte]=${encodeURIComponent(nowISO)}`
    );

    return parts;
  }

  return parts;
}

function buildPromoFiltersForVariantsProduct(
  slug: string,
  nowISO: string,
  currencyCode: string
): string[] {
  const parts: string[] = [];

  if (slug === "on-sale") {
    const currency = String(currencyCode || "AUD").trim().toUpperCase();

    parts.push(
      `filters[$and][0][product][prices][currency][$eq]=${encodeURIComponent(
        currency
      )}`
    );
    parts.push(
      `filters[$and][0][product][prices][sale_starts_at][$notNull]=true`
    );
    parts.push(
      `filters[$and][0][product][prices][sale_starts_at][$lte]=${encodeURIComponent(
        nowISO
      )}`
    );
    parts.push(
      `filters[$and][0][$or][0][product][prices][sale_ends_at][$null]=true`
    );
    parts.push(
      `filters[$and][0][$or][1][product][prices][sale_ends_at][$gte]=${encodeURIComponent(
        nowISO
      )}`
    );

    return parts;
  }

  if (slug === "new-in") {
    parts.push(`filters[product][new_starts_at][$notNull]=true`);
    parts.push(
      `filters[product][new_starts_at][$lte]=${encodeURIComponent(nowISO)}`
    );
    parts.push(`filters[$or][0][product][new_ends_at][$null]=true`);
    parts.push(
      `filters[$or][1][product][new_ends_at][$gte]=${encodeURIComponent(
        nowISO
      )}`
    );

    return parts;
  }

  return parts;
}

export function useCategoryFacets({
  slug,
  categoryDocIds,
  displayCurrency,
  devLogPrefix = "Facets",
}: UseCategoryFacetsArgs) {
  const DEV = process.env.NODE_ENV !== "production";
  const dbg = (...args: unknown[]) => DEV && console.debug(`[${devLogPrefix}]`, ...args);

  const [facetMaterials, setFacetMaterials] = useState<string[]>([]);
  const [facetSizes, setFacetSizes] = useState<string[]>([]);
  const [facetColors, setFacetColors] = useState<string[]>([]);
  const [facetGenders, setFacetGenders] = useState<string[]>([]);

  const [variantFiltersSupported, setVariantFiltersSupported] = useState(true);
  const [productGenderSupported, setProductGenderSupported] = useState(true);

  useEffect(() => {
    let aborted = false;

    async function fetchFacets() {
      const partsForProducts: string[] = [];
      const partsForVariants: string[] = [];
      const promo = isPromoSlug(slug);
      const nowISO = new Date().toISOString();

      if (!promo) {
        if (categoryDocIds?.length) {
          categoryDocIds.forEach((id, i) => {
            const enc = encodeURIComponent(id);
            partsForProducts.push(`filters[category][documentId][$in][${i}]=${enc}`);
            partsForVariants.push(
              `filters[product][category][documentId][$in][${i}]=${enc}`
            );
          });
        } else {
          const enc = encodeURIComponent(slug);
          partsForProducts.push(`filters[category][slug][$eq]=${enc}`);
          partsForVariants.push(`filters[product][category][slug][$eq]=${enc}`);
        }
      } else {
        // promo：全站聚合（挂在 product 上）
        partsForProducts.push(
          ...buildPromoFiltersForProducts(slug, nowISO, displayCurrency)
        );

        partsForVariants.push(
          ...buildPromoFiltersForVariantsProduct(
            slug,
            nowISO,
            displayCurrency
          )
        );
      }

      // 仅统计/展示「被上架显示」的商品
      partsForProducts.push(`filters[is_showed][$eq]=true`);
      partsForVariants.push(`filters[product][is_showed][$eq]=true`);
      // 仅统计已上架的变体
      partsForVariants.push(`filters[is_showed][$eq]=true`);

      try {
        const qsV =
          `/api/variants?${partsForVariants.join("&")}` +
          `&fields[0]=material&fields[1]=size&fields[2]=color` +
          `&pagination[pageSize]=500&publicationState=live`;

        dbg("variants facets GET", qsV);

        const [vJson, pJson] = await Promise.all([
          api(qsV, { noCache: true }).catch((e) => {
            dbg("variants facets error", e?.message || e);
            setVariantFiltersSupported(false);
            return null;
          }),
          api(
            `/api/products?${partsForProducts.join("&")}` +
              `&fields[0]=gender&pagination[pageSize]=500&publicationState=live`,
            { noCache: true }
          ).catch((e) => {
            dbg("products gender facets error", e?.message || e);
            setProductGenderSupported(false);
            return null;
          }),
        ]);

        if (!aborted && vJson) {
          const rows: any[] = Array.isArray(vJson?.data) ? vJson.data : [];
          const m = new Set<string>();
          const s = new Set<string>();
          const c = new Set<string>();

          for (const r of rows) {
            const a = r?.attributes ?? r ?? {};
            if (a.material && String(a.material).trim()) m.add(String(a.material).trim());
            if (a.size && String(a.size).trim()) s.add(String(a.size).trim());
            if (a.color && String(a.color).trim()) c.add(normalizeColorName(a.color));
          }

          setFacetMaterials(Array.from(m).sort((a, b) => a.localeCompare(b)));
          setFacetSizes(sortSizes(Array.from(s)));
          setFacetColors(Array.from(c).sort((a, b) => a.localeCompare(b)));
        }

        if (!aborted && pJson) {
          const rows: any[] = Array.isArray(pJson?.data) ? pJson.data : [];
          const g = new Set<string>();
          for (const r of rows) {
            const a = r?.attributes ?? r ?? {};
            const v = a.gender;
            if (v && String(v).trim()) g.add(String(v).trim());
          }
          setFacetGenders(Array.from(g).sort((a, b) => a.localeCompare(b)));
        }
      } catch {
        // ignore
      }
    }

    fetchFacets();
    return () => {
      aborted = true;
    };
  }, [
    slug,
    JSON.stringify(categoryDocIds),
    displayCurrency,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    facetMaterials,
    facetSizes,
    facetColors,
    facetGenders,
    variantFiltersSupported,
    productGenderSupported,
  };
}