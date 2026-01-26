// src/app/category/[slug]/CategoryGridClient.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import Pagination from "@/components/pagination/Pagination";
import FilterDrawer from "./_components/FilterDrawer";
import ProductGrid from "./_components/ProductGrid";
import CategoryHeader from "./_components/CategoryHeader";

import { useCategoryFacets } from "./_hooks/useCategoryFacets";
import { useCategoryProducts } from "./_hooks/useCategoryProducts";
import { useCategoryQueryState } from "./_hooks/useCategoryQueryState";
import { useFilterDraft } from "./_hooks/useFilterDraft";

import {
  normalizeProduct,
  pickPriceForCurrency,
  formatPriceForCard,
  formatPriceVal,
  isSaleActiveByLegacy,
  salePriceLegacy,
} from "./_lib/categoryProductMapper";

type Props = {
  slug: string;
  title: string;
  total: number;
  pageSize?: number;
  categoryDocIds?: string[];
  displayCurrency?: string;
};

export type SortKey = "default" | "price-desc" | "price-asc" | "hot";

// ---------- helpers ----------
const toCents = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) : undefined;

export default function CategoryGridClient({
  slug,
  title,
  total,
  pageSize = 40,
  categoryDocIds,
  displayCurrency = "AUD",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // === Refs：无障碍焦点管理 ===
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // === URL query state（抽出）===
  const {
    pageParam,
    sortKey,
    setSortInUrl,
    appliedMin,
    appliedMax,
    appliedMaterials,
    appliedSizes,
    appliedColors,
    appliedGenders,
    basePage,
  } = useCategoryQueryState({ slug, total, pageSize });

  // === Drawer draft（抽出）===
  const {
    open,
    setOpen,
    draftMin,
    setDraftMin,
    draftMax,
    setDraftMax,
    draftMaterials,
    setDraftMaterials,
    draftSizes,
    setDraftSizes,
    draftColors,
    setDraftColors,
    draftGenders,
    setDraftGenders,
    resetDraft,
    applyDraft,
  } = useFilterDraft({
    slug,
    appliedMin,
    appliedMax,
    appliedMaterials,
    appliedSizes,
    appliedColors,
    appliedGenders,
  });

  // 打开后把焦点放到 Close；Esc 关闭并把焦点还给 Filter
  useEffect(() => {
    if (!open) return;
    setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement | null)?.blur?.();
        setOpen(false);
        setTimeout(() => triggerBtnRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // facets
  const {
    facetMaterials,
    facetSizes,
    facetColors,
    facetGenders,
    variantFiltersSupported,
    productGenderSupported,
  } = useCategoryFacets({ slug, categoryDocIds, devLogPrefix: "GridFacets" });

  // sort query
  const sortQueryString = useMemo(() => {
    switch (sortKey) {
      case "price-desc":
        return `&sort[0]=base_price_cents:desc&sort[1]=priority:asc`;
      case "price-asc":
        return `&sort[0]=base_price_cents:asc&sort[1]=priority:asc`;
      case "hot":
        return `&sort[0]=hot_score:desc&sort[1]=priority:asc`;
      default:
        return `&sort[0]=priority:asc&sort[1]=updatedAt:desc`;
    }
  }, [sortKey]);

  // products
  const { loading, list, error, filteredTotal: filteredTotalFromApi } =
    useCategoryProducts({
      slug,
      categoryDocIds,
      page: basePage,
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
      devLogPrefix: "GridProducts",
    });

  // ✅ 兜底：首次加载/接口异常时，仍然使用 server 传入的 total
  const filteredTotal =
    Number.isFinite(filteredTotalFromApi) && filteredTotalFromApi > 0
      ? filteredTotalFromApi
      : total;

  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const page = Math.min(basePage, pageCount);

  // ✅ 当筛选导致总数变少，URL page 超过最大页时，自动纠正到最后一页（不使用 window）
  useEffect(() => {
    const raw = pageParam ?? "1";
    const requested = Number(raw);

    if (!Number.isFinite(requested) || requested < 1) return;
    if (requested <= pageCount) return;

    const next = new URLSearchParams(sp.toString());
    next.set("page", String(pageCount));
    router.replace(`${pathname}?${next.toString()}`);
  }, [pageParam, pageCount, router, pathname, sp]);

  const start = (page - 1) * pageSize;

  // === 固定“画布高度”：按 40 个商品、4 列来估算一页高度 ===
  const desktopColumns = 4;
  const rowsForFullPage = Math.ceil(pageSize / desktopColumns);
  const approxRowHeight = 520;
  const fullPageHeightPx = rowsForFullPage * approxRowHeight;

  const sectionMinHeightStyle: CSSProperties = {
    minHeight: fullPageHeightPx,
  };

  // ✅ Pagination 的链接生成：不使用 window，保留现有 query，只替换 page
  const hrefForPage = useMemo(() => {
    const base = new URLSearchParams(sp.toString());

    return (p: number) => {
      const next = new URLSearchParams(base.toString());
      next.set("page", String(p));
      return `${pathname}?${next.toString()}`;
    };
  }, [sp, pathname]);

  const resultLabel = `${filteredTotal} ${
    filteredTotal === 1 ? "result" : "results"
  }`;

  // 统一关闭抽屉（焦点回退）
  const closeDrawer = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  // Apply（焦点回退留在页面处理）
  const onApply = () => {
    applyDraft();
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  // Reset（只清草稿）
  const onReset = () => {
    resetDraft();
  };

  return (
    <>
      <CategoryHeader
        title={title}
        slug={slug}
        resultLabel={resultLabel}
        sortKey={sortKey}
        setSortInUrl={setSortInUrl}
        onOpenFilter={() => setOpen(true)}
        triggerBtnRef={triggerBtnRef}
      />

      <FilterDrawer
        open={open}
        onClose={closeDrawer}
        closeBtnRef={closeBtnRef}
        variantFiltersSupported={variantFiltersSupported}
        productGenderSupported={productGenderSupported}
        facetMaterials={facetMaterials}
        facetSizes={facetSizes}
        facetColors={facetColors}
        facetGenders={facetGenders}
        draftMin={draftMin}
        setDraftMin={setDraftMin}
        draftMax={draftMax}
        setDraftMax={setDraftMax}
        draftMaterials={draftMaterials}
        setDraftMaterials={setDraftMaterials}
        draftSizes={draftSizes}
        setDraftSizes={setDraftSizes}
        draftColors={draftColors}
        setDraftColors={setDraftColors}
        draftGenders={draftGenders}
        setDraftGenders={setDraftGenders}
        onReset={onReset}
        onApply={onApply}
      />

      <ProductGrid
        error={error}
        loading={loading}
        list={list}
        start={start}
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

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefForPage={hrefForPage}
        className="mb-10"
      />
    </>
  );
}
