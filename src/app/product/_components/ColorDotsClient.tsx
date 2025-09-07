// src/app/product/_components/ColorDotsClient.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeColorName, colorNameToCss } from "@/lib/colors";

export type ColorOption = {
  name: string;      // 原始颜色名，如 "tan" / "Dark Brown" / "gray"
  css?: string;      // （可选）直接传入的 CSS 颜色值，传了会优先生效
  preview?: string;  // （可选）该颜色的首图，映射不到颜色时用它做背景兜底
};

type Props = {
  options: ColorOption[];
  current?: string;  // 当前已选颜色（任意大小写/空格都可）
  slug: string;
};

export default function ColorDotsClient({ options, current, slug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // 切颜色时，顺手重置 img（大图索引）和 size（避免保留旧尺码）
  const baseSearch = useMemo(() => {
    const p = new URLSearchParams(sp?.toString());
    p.delete("img");
    p.delete("size");
    return p;
  }, [sp]);

  const normalizedCurrent = current ? normalizeColorName(current) : undefined;

  const go = (nameRaw: string) => {
    const p = new URLSearchParams(baseSearch);
    p.set("color", normalizeColorName(nameRaw));
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Select color">
      {options.map((opt) => {
        const normalized = normalizeColorName(opt.name);
        const active = normalizedCurrent === normalized;
        return (
          <Swatch
            key={normalized}
            name={opt.name}
            css={opt.css}
            preview={opt.preview}
            active={active}
            onClick={() => go(opt.name)}
          />
        );
      })}
    </div>
  );
}

function Swatch({
  name,
  css,
  preview,
  active,
  onClick,
}: {
  name: string;
  css?: string;
  preview?: string;
  active?: boolean;
  onClick: () => void;
}) {
  // 统一颜色名 -> 颜色映射；优先使用 props.css
  const normalized = normalizeColorName(name);
  const mappedCss = css ?? colorNameToCss(normalized);

  // 背景策略：映射到颜色 -> 用 backgroundColor；否则用 preview 图；再否则灰色
  const style: React.CSSProperties = mappedCss
    ? { backgroundColor: mappedCss }
    : preview
    ? {
        backgroundImage: `url(${preview})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: "#ddd" };

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-checked={active}
      role="radio"
      className={[
        // 更大的可点击热区
        "relative inline-flex h-7 w-7 items-center justify-center rounded-full",
        // 选中与 hover 的边框效果
        active
          ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white"
          : "ring-1 ring-black/10 hover:ring-black/30",
        // 可见焦点
        "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
      ].join(" ")}
    >
      {/* 内圈色点（充满容器） */}
      <span
        className="block h-7 w-7 rounded-full bg-neutral-200"
        style={style}
        aria-hidden="true"
      />
    </button>
  );
}
