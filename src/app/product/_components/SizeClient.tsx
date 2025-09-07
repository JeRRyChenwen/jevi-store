// src/app/product/_components/SizeClient.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SizeOption = { value: string; stock?: number };

type Props = {
  options: SizeOption[];
  current?: string;
  slug: string;
  /** 控制按钮体量：默认 md，可选 sm | md | lg | xl */
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE_STYLES = {
  sm: { btn: "h-8 min-w-8 px-3 text-[13px]", gap: "gap-2" },
  md: { btn: "h-9 min-w-9 px-3 text-sm", gap: "gap-2.5" },
  lg: { btn: "h-11 min-w-11 px-4 text-base", gap: "gap-3" },
  xl: { btn: "h-12 min-w-12 px-4 text-base", gap: "gap-3.5" },
} as const;

export default function SizeClient({ options, current, size = "md" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const cfg = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  // 切尺码时保留其它参数（如 color），但重置 img 索引
  const baseSearch = useMemo(() => {
    const p = new URLSearchParams(sp?.toString());
    p.delete("img");
    return p;
  }, [sp]);

  const go = (val: string) => {
    const p = new URLSearchParams(baseSearch);
    p.set("size", val);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div
      className={`flex flex-wrap ${cfg.gap}`}
      role="radiogroup"
      aria-label="Select size"
    >
      {options.map((opt) => {
        const active = opt.value === current;
        const disabled = (opt.stock ?? 0) <= 0;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={disabled || undefined}
            onClick={() => !disabled && go(opt.value)}
            disabled={disabled}
            title={
              disabled ? `${opt.value} (Out of stock)` : `${opt.value} (In stock: ${opt.stock ?? 0})`
            }
            className={[
              "inline-flex items-center justify-center rounded-full border font-medium",
              cfg.btn,
              // 基础边框/背景
              "border-neutral-300 bg-white",
              // 交互与状态
              "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
              active ? "border-neutral-900 shadow-sm" : "hover:border-neutral-400",
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}
