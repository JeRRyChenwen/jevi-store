// src/app/product/_components/SizeClient.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SizeOption = { value: string; stock: number };

type Props = {
  options: SizeOption[];
  current?: string;
  slug: string;
};

export default function SizeClient({ options, current, slug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const baseSearch = useMemo(() => {
    const p = new URLSearchParams(sp?.toString());
    p.delete("img");     // 换尺码时重置大图索引
    return p;
  }, [sp]);

  const go = (val: string, disabled: boolean) => {
    if (disabled) return;
    const p = new URLSearchParams(baseSearch);
    p.set("size", val);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Select size">
      {options.map(({ value, stock }) => {
        const active = value === current;
        const disabled = stock <= 0;

        return (
          <button
            key={value}
            type="button"
            onClick={() => go(value, disabled)}
            title={disabled ? `${value} · Out of stock` : `${value} · In stock: ${stock}`}
            aria-checked={active}
            aria-disabled={disabled}
            role="radio"
            className={[
              "px-3 py-1.5 rounded-full text-sm border transition",
              active
                ? "border-neutral-900 text-neutral-900"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-500",
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70",
            ].join(" ")}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
