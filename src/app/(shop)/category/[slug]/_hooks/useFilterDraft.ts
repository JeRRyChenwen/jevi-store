// src/app/(shop)/category/[slug]/_hooks/useFilterDraft.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useFilterDraft({
  slug,

  appliedMin,
  appliedMax,
  appliedMaterials,
  appliedSizes,
  appliedColors,
  appliedGenders,
}: {
  slug: string;

  appliedMin?: number;
  appliedMax?: number;
  appliedMaterials: string[];
  appliedSizes: string[];
  appliedColors: string[];
  appliedGenders: string[];
}) {
  const router = useRouter();

  // Drawer open
  const [open, setOpen] = useState(false);

  // Draft values
  const [draftMin, setDraftMin] = useState<number | undefined>(appliedMin);
  const [draftMax, setDraftMax] = useState<number | undefined>(appliedMax);
  const [draftMaterials, setDraftMaterials] = useState<Set<string>>(new Set(appliedMaterials));
  const [draftSizes, setDraftSizes] = useState<Set<string>>(new Set(appliedSizes));
  const [draftColors, setDraftColors] = useState<Set<string>>(new Set(appliedColors));
  const [draftGenders, setDraftGenders] = useState<Set<string>>(new Set(appliedGenders));

  // 打开抽屉时，用已应用筛选重置草稿
  useEffect(() => {
    if (!open) return;
    setDraftMin(appliedMin);
    setDraftMax(appliedMax);
    setDraftMaterials(new Set(appliedMaterials));
    setDraftSizes(new Set(appliedSizes));
    setDraftColors(new Set(appliedColors));
    setDraftGenders(new Set(appliedGenders));
  }, [
    open,
    appliedMin,
    appliedMax,
    appliedMaterials.join(","),
    appliedSizes.join(","),
    appliedColors.join(","),
    appliedGenders.join(","),
  ]);

  const resetDraft = () => {
    setDraftMin(undefined);
    setDraftMax(undefined);
    setDraftMaterials(new Set());
    setDraftSizes(new Set());
    setDraftColors(new Set());
    setDraftGenders(new Set());
  };

  const applyDraft = () => {
    const u = new URL(window.location.href);

    if (typeof draftMin === "number" && draftMin >= 0) u.searchParams.set("min", String(draftMin));
    else u.searchParams.delete("min");

    if (typeof draftMax === "number" && draftMax >= 0) u.searchParams.set("max", String(draftMax));
    else u.searchParams.delete("max");

    const setCSV = (key: string, set: Set<string>) => {
      const arr = Array.from(set).filter(Boolean);
      if (arr.length) u.searchParams.set(key, arr.join(","));
      else u.searchParams.delete(key);
    };

    setCSV("material", draftMaterials);
    setCSV("size", draftSizes);
    setCSV("color", draftColors);
    setCSV("gender", draftGenders);

    u.searchParams.set("page", "1");

    // 这里先关抽屉，再跳转 URL（不做焦点管理；焦点回退仍在页面里做）
    setOpen(false);
    router.replace(`/category/${slug}${u.search}`);
  };

  return {
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
  };
}
