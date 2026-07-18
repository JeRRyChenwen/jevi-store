// src/app/product/_components/GalleryClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  images: string[];
  title: string;
  slug: string;
  selectedIndex?: number;
  /** 当前选中的颜色（来自 ?color=），用于在切换缩略图时保留这个参数 */
  color?: string;
};

export default function GalleryClient({
  images,
  title,
  slug,
  selectedIndex = 0,
  color,
}: Props) {
  const N = images?.length ?? 0;
  const selected = Math.max(0, Math.min(selectedIndex, Math.max(0, N - 1)));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const list = useMemo(
    () =>
      images.map((url, index) => ({
        url,
        index,
      })),
    [images],
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  if (!N) {
    return (
      <div className="flex h-[140px] w-[140px] items-center justify-center rounded-xl border bg-neutral-100 text-xs text-neutral-500">
        No Image
      </div>
    );
  }

  // 横向长方形（如需竖向改成 "aspect-[3/4]"）
  // const THUMB_ASPECT = "aspect-[4/3]";
  const THUMB_ASPECT = "aspect-[3/4]";

  return (
    <div
      ref={containerRef}
      aria-label="Product image thumbnails"
      role="list"
      className={[
        "relative flex min-w-0 gap-4 overflow-x-auto py-1 px-1",
        "lg:max-h-[76vh] lg:flex-col lg:gap-5 lg:overflow-x-hidden lg:overflow-y-auto lg:px-1 lg:py-2",
        "[scrollbar-width:none] [-ms-overflow-style:none]",
        "[&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:bg-transparent",
      ].join(" ")}
    >
      {list.map(({ url, index }) => {
        const active = index === selected;

        const qs = new URLSearchParams();
        qs.set("img", String(index));

        if (color) {
          qs.set("color", color);
        }

        return (
          <Link
            key={`${index}-${url}`}
            href={`/product/${slug}?${qs.toString()}`}
            prefetch
            aria-current={active ? "true" : undefined}
            aria-label={`Preview ${index + 1}`}
            aria-selected={active}
            role="listitem"
            ref={active ? activeRef : undefined}
            className={[
              "group block w-[112px] shrink-0 select-none overflow-hidden sm:w-[128px] lg:w-full",
              active
                ? "ring-2 ring-neutral-900"
                : "ring-1 ring-neutral-300 hover:ring-neutral-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/80 focus-visible:ring-offset-0",
            ].join(" ")}
          >
            <div
              className={`${THUMB_ASPECT} relative overflow-hidden bg-white`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${title} preview ${index + 1}`}
                className="absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
