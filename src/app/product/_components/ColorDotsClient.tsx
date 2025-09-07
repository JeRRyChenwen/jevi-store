// src/app/product/_components/ColorDotsClient.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ColorOption = { name: string; css?: string };

type Props = {
  options: ColorOption[]; // 注意：父组件要传 css 好了的颜色值
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
      {options.map(({ name, css }) => (
        <Swatch
          key={name}
          name={name}
          css={css}
          active={name === current}
          onClick={() => go(name)}
        />
      ))}
    </div>
  );
}

function Swatch({
  name,
  css,
  active,
  onClick,
}: {
  name: string;
  css?: string;
  active?: boolean;
  onClick: () => void;
}) {
  const style: React.CSSProperties = { backgroundColor: css || "#ddd" };

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-checked={active}
      role="radio"
      className={[
        "h-12 w-12 rounded-full ring-1 ring-neutral-300",
        "transition outline-none focus-visible:ring-2 focus-visible:ring-black/70",
        active ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white" : "",
      ].join(" ")}
      style={style}
    />
  );
}
