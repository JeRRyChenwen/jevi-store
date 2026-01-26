// src/app/(shop)/category/[slug]/_hooks/useCategoryQueryState.ts
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SortKey } from "../CategoryGridClient";

function parseCSV(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key)?.trim() || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useCategoryQueryState({
  slug,
  total,
  pageSize,
}: {
  slug: string;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // Sort（来自 URL）
  const sortKey = (sp.get("sort") as SortKey) || "default";

  const setSortInUrl = (next: SortKey) => {
    const u = new URL(window.location.href);
    if (next === "default") u.searchParams.delete("sort");
    else u.searchParams.set("sort", next);
    u.searchParams.set("page", "1");
    router.replace(`/category/${slug}${u.search}`);
  };

  // 已应用筛选（来自 URL）
  const minParam = sp.get("min");
  const maxParam = sp.get("max");

  const appliedMin = useMemo(
    () => (minParam ? Math.max(0, Number(minParam)) : undefined),
    [minParam]
  );
  const appliedMax = useMemo(
    () => (maxParam ? Math.max(0, Number(maxParam)) : undefined),
    [maxParam]
  );

  const appliedMaterials = useMemo(() => parseCSV(sp, "material"), [sp]);
  const appliedSizes = useMemo(() => parseCSV(sp, "size"), [sp]);
  const appliedColors = useMemo(() => parseCSV(sp, "color"), [sp]);
  const appliedGenders = useMemo(() => parseCSV(sp, "gender"), [sp]);

  // 分页（先用 server total 计算“基础 page”，避免 filteredTotal 未定义的循环依赖）
  const pageParam = sp.get("page");
  const basePageCount = Math.max(1, Math.ceil(total / pageSize));

  const basePage = (() => {
    const n = Number(pageParam ?? "1");
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, basePageCount);
  })();

  return {
    // url state
    pageParam,
    sortKey,

    // actions
    setSortInUrl,

    // applied filters
    appliedMin,
    appliedMax,
    appliedMaterials,
    appliedSizes,
    appliedColors,
    appliedGenders,

    // base paging
    basePageCount,
    basePage,
  };
}
