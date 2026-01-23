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
}: {
  options: Option[];
  current?: number;
  slug: string;
  paramKey?: string; // URL query key，默认用 height
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const sorted = useMemo(() => {
    return [...options].sort((a, b) => a.value - b.value);
  }, [options]);

  function setHeight(next: number) {
    const nextSp = new URLSearchParams(sp.toString());
    nextSp.set(paramKey, String(next));
    // 你如果希望切换 height 时重置图片索引，可取消注释：
    // nextSp.delete("img");
    router.push(`/product/${encodeURIComponent(slug)}?${nextSp.toString()}`);
  }

  if (!sorted.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-base md:text-lg text-neutral-700 flex items-center gap-2">
        Height increase
        {typeof current === "number" && Number.isFinite(current) ? (
          <span className="text-neutral-900 font-semibold text-base md:text-lg">
            +{current} cm
          </span>
        ) : null}
      </div>

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
              className={
                active
                  ? "border-2 border-black bg-muted text-black"
                  : "border"
              }
              onClick={() => setHeight(opt.value)}
              title={disabled ? "Out of stock" : `+${opt.value} cm`}
            >
              +{opt.value} cm
            </Button>
          );
        })}
      </div>

      {/* 可选提示 */}
      {typeof current !== "number" && (
        <div className="text-sm text-neutral-600">Please select a height increase</div>
      )}
    </div>
  );
}
