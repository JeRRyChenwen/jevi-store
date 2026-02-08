"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/strapi";

/**
 * 说明：
 * - 这里不强依赖 ProductLite 类型导出（避免跨文件导出不一致）
 * - normalizeProduct 由父组件传入（完全复用你现在的解析逻辑，不改业务）
 */

type PriceRec = any;

export type UseCategoryProductsArgs = {
  slug: string;
  categoryDocIds?: string[];

  // paging/sorting
  page: number;
  pageSize: number;
  sortQueryString: string;

  // applied filters（来自 URL）
  appliedMin?: number;
  appliedMax?: number;
  appliedGenders: string[];
  appliedMaterials: string[];
  appliedSizes: string[];
  appliedColors: string[];

  // helpers
  toCents: (n?: number | null) => number | undefined;
  normalizeProduct: (row: any) => any;

  devLogPrefix?: string;
};

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
  const dbg = (...args: unknown[]) =>
    DEV && console.debug(`[${devLogPrefix}]`, ...args);

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);

  // 为依赖数组准备稳定 key（避免每次 render 都触发）
  const categoryKey = useMemo(
    () => JSON.stringify(categoryDocIds ?? []),
    [categoryDocIds]
  );
  const gendersKey = useMemo(() => appliedGenders.join(","), [appliedGenders]);
  const materialsKey = useMemo(
    () => appliedMaterials.join(","),
    [appliedMaterials]
  );
  const sizesKey = useMemo(() => appliedSizes.join(","), [appliedSizes]);
  const colorsKey = useMemo(() => appliedColors.join(","), [appliedColors]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const parts: string[] = [];

        // 分类
        if (categoryDocIds?.length) {
          categoryDocIds.forEach((id, i) =>
            parts.push(
              `filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`
            )
          );
        } else {
          parts.push(`filters[category][slug][$eq]=${encodeURIComponent(slug)}`);
        }

        // 仅展示「被上架显示」的商品
        parts.push(`filters[is_showed][$eq]=true`);

        /**
         * ✅ IMPORTANT：
         * 你已经从 Strapi Product 删除了 legacy 字段 base_price_cents / discount_percent_off。
         * 目前价格来自 prices 组件（多币种），而 Strapi 对组件数组做数值范围过滤并不直接支持。
         *
         * 因此这里先“临时禁用”价格区间过滤，避免 400 Bad Request。
         * 未来如果你要恢复价格区间过滤，我们再做 Phase 2：
         * - 在 Product/Variant 上增加一个可过滤的数值字段（如 min_price_minor_aud / base_price_minor_aud），由后台同步维护
         */
        const minCents = toCents(appliedMin);
        const maxCents = toCents(appliedMax);
        if (typeof minCents === "number" || typeof maxCents === "number") {
          dbg(
            "price range filter is temporarily disabled (legacy base_price_cents removed):",
            { minCents, maxCents }
          );
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

        // color：OR + containsi（你现有逻辑）
        const pushColorORContainsI = (colors: string[]) => {
          colors
            .map((v) => String(v || "").trim())
            .filter(Boolean)
            .forEach((v, i) => {
              parts.push(
                `filters[$or][${i}][variants][color][$containsi]=${encodeURIComponent(
                  v
                )}`
              );
            });
        };

        if (appliedMaterials.length) pushIN("material", appliedMaterials);
        if (appliedSizes.length) pushIN("size", appliedSizes);
        if (appliedColors.length) pushColorORContainsI(appliedColors);

        /**
         * ✅ fields：
         * 删掉 base_price_cents / currency / discount_percent_off（legacy 字段）
         * 价格走 populate[prices]=*，具体展示逻辑在 normalizeProduct / price picker 中完成
         */
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

        dbg("appliedColors", appliedColors);
        dbg("parts(color)", parts.filter((p) => p.includes("color")));
        dbg("final parts count", parts.length);
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
