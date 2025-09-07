// src/app/product/_components/ColorDotsClient.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ColorOption = { name: string; preview?: string };

type Props = {
  options: ColorOption[];
  current?: string;
  slug: string;
};

export default function ColorDotsClient({ options, current, slug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const baseSearch = useMemo(() => {
    const p = new URLSearchParams(sp?.toString());
    p.delete("img"); // 切颜色时重置大图索引
    return p;
  }, [sp]);

  const go = (name: string) => {
    const p = new URLSearchParams(baseSearch);
    p.set("color", name);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Select color">
      {options.map(({ name, preview }) => (
        <Swatch
          key={name}
          name={name}
          preview={preview}
          active={name === current}
          onClick={() => go(name)}
        />
      ))}
    </div>
  );
}

/** 不使用 document 的简易 CSS 颜色判断 */
function looksLikeCssColor(s: string) {
  const v = (s || "").trim().toLowerCase();
  if (!v) return false;
  // #rgb/#rgba/#rrggbb/#rrggbbaa
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v)) return true;
  // rgb()/rgba()/hsl()/hsla()
  if (/^(?:rgb|hsl)a?\(/.test(v)) return true;
  // 纯单词（命名色），带连字符的一律当作非命名色
  if (/^[a-z]+$/.test(v) && !v.includes("-")) return true;
  return false;
}

function Swatch({
  name,
  preview,
  active,
  onClick,
}: {
  name: string;
  preview?: string;
  active?: boolean;
  onClick: () => void;
}) {
  const style: React.CSSProperties = looksLikeCssColor(name)
    ? { backgroundColor: name }
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
        "h-5 w-5 rounded-full ring-1 ring-neutral-300",
        "transition outline-none focus-visible:ring-2 focus-visible:ring-black/70",
        active ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white" : "",
      ].join(" ")}
      style={style}
    />
  );
}
