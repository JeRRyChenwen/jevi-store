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
} from "./_lib/categoryProductMapper";

type Props = {
  slug: string;
  title: string;
  description?: string;
  total: number;
  pageSize?: number;
  categoryDocIds?: string[];
  displayCurrency: string;
};

export type SortKey = "default" | "price-desc" | "price-asc" | "hot";

// ---------- helpers ----------
const toCents = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) : undefined;

// ✅ 你新增的“虚拟分类”
const VIRTUAL_SLUGS = ["new-in", "on-sale"] as const;
type VirtualSlug = (typeof VIRTUAL_SLUGS)[number];

function isVirtualSlug(slug: string): slug is VirtualSlug {
  return (VIRTUAL_SLUGS as readonly string[]).includes(slug);
}

/**
 * ✅ 生成虚拟分类的 products 过滤条件（用于 hook 内构建 Strapi 查询）
 * - new-in: newStartsAt <= now AND (newEndsAt is null OR newEndsAt >= now)
 * - on-sale: saleStartsAt <= now AND (saleEndsAt is null OR saleEndsAt >= now)
 *
 * 注意：字段名按 camelCase 写（与你前面 server 端 page.tsx 一致）
 * 如果你 Strapi 实际字段是 snake_case，请在 hook 里替换字段名即可。
 */
type VirtualFilter =
  | {
      kind: "new-in";
      nowISO: string;
    }
  | {
      kind: "on-sale";
      nowISO: string;
    }
  | null;

export default function CategoryGridClient({
  slug,
  title,
  description,
  total,
  pageSize = 40,
  categoryDocIds,
  displayCurrency,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // === Refs：无障碍焦点管理 ===
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // ✅ 给 new-in / on-sale 一个“稳定的 now”（同一次渲染周期内不抖动）
  // - 这里用 useMemo 固定住，避免每次 re-render now 都变导致无限请求
  const virtualFilter: VirtualFilter = useMemo(() => {
    if (!isVirtualSlug(slug)) return null;

    const nowISO = new Date().toISOString();

    return slug === "new-in"
      ? { kind: "new-in", nowISO }
      : { kind: "on-sale", nowISO };
  }, [slug]);

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
  } = useCategoryFacets({
    slug,
    categoryDocIds,
    displayCurrency,
    devLogPrefix: "GridFacets",
    // ✅ NEW：虚拟分类过滤（让 hook 内改用时间窗 filters，而不是 category slug）
    virtualFilter,
  });

  /**
   * ✅ IMPORTANT：
   * 你已经删除了 Product 的 legacy 字段 base_price_cents / discount_percent_off，
   * 并且现在价格来自 prices 组件（多币种）。
   *
   * Strapi 无法直接对“组件数组 prices”做货币感知的排序，
   * 所以这里先把 price-asc / price-desc 降级成默认排序，避免 400。
   */
  const sortQueryString = useMemo(() => {
    switch (sortKey) {
      case "hot":
        return `&sort[0]=hot_score:desc&sort[1]=priority:asc`;
      case "price-desc":
      case "price-asc":
        // 暂时降级：不按价格排序（避免请求不存在字段 base_price_cents）
        return `&sort[0]=priority:asc&sort[1]=updatedAt:desc`;
      default:
        return `&sort[0]=priority:asc&sort[1]=updatedAt:desc`;
    }
  }, [sortKey]);

  // products
  const {
    loading,
    list,
    error,
    filteredTotal: filteredTotalFromApi,
  } = useCategoryProducts({
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
    displayCurrency,
    toCents,
    normalizeProduct,
    devLogPrefix: "GridProducts",
    // ✅ NEW：虚拟分类过滤（让 hook 内改用时间窗 filters，而不是 category slug）
    virtualFilter,
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
        description={description}
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
