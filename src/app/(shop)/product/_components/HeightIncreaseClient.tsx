"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Option = {
  value: number; // cm
  stock?: number; // 可选：用于显示/禁用
};

export default function HeightIncreaseClient({
  options,
  current,
  slug,
  paramKey = "height",
  showHeader = true,
  headerClassName,
}: {
  options: Option[];
  current?: number;
  slug: string;
  paramKey?: string; // URL query key，默认用 height
  showHeader?: boolean; // ✅ NEW: 是否显示 “Height increase +X cm” 这行
  headerClassName?: string; // ✅ NEW: 可选，外部自定义 header 样式
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const sorted = useMemo(() => {
    return [...options].sort((a, b) => a.value - b.value);
  }, [options]);

  function setHeight(next: number) {
    const nextSp = new URLSearchParams(sp.toString());
    nextSp.set(paramKey, String(next));
    router.push(`/product/${encodeURIComponent(slug)}?${nextSp.toString()}`);
  }

  if (!sorted.length) return null;

  return (
    <div className="space-y-2">
      {/* ✅ Header 可关闭 */}
      {showHeader ? (
        <div className="text-sm text-neutral-600 flex items-center gap-2">
        <span className="font-medium text-neutral-800">Height increase</span>

        {typeof current === "number" && Number.isFinite(current) ? (
          <>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-900 font-semibold">+{current} cm</span>
          </>
        ) : null}
      </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {sorted.map((opt) => {
          const active = opt.value === current;
          const disabled = typeof opt.stock === "number" ? opt.stock <= 0 : false;

          return (
            <Button
              key={opt.value}
              type="button"
              variant="outline"
              disabled={disabled}
              className={active ? "border-2 border-black bg-muted text-black" : "border"}
              onClick={() => setHeight(opt.value)}
              title={disabled ? "Out of stock" : `+${opt.value} cm`}
            >
              +{opt.value} cm
            </Button>
          );
        })}
      </div>

      {/* 可选提示：showHeader=false 时通常不需要提示（由外层统一展示） */}
      {showHeader && typeof current !== "number" && (
        <div className="text-sm text-neutral-600">Please select a height increase</div>
      )}
    </div>
  );
}
