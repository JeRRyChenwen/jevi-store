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
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);

  const USE_VIRTUAL = N >= 4;

  const list = useMemo(() => {
    if (!N) return [] as Array<{ url: string; orig: number; vIndex: number }>;
    if (!USE_VIRTUAL) {
      return images.map((url, i) => ({ url, orig: i, vIndex: i }));
    }
    return Array.from({ length: N * 3 }, (_, i) => ({
      url: images[i % N],
      orig: i % N,
      vIndex: i,
    }));
  }, [N, images, USE_VIRTUAL]);

  const middleStart = USE_VIRTUAL ? N : 0;

  const getUnit = () => {
    const first = firstItemRef.current as HTMLElement | null;
    if (!first) return 0;
    const next = first.nextElementSibling as HTMLElement | null;
    if (next) return Math.max(1, next.offsetTop - first.offsetTop);
    return Math.max(1, first.offsetHeight);
  };

  useEffect(() => {
    if (!USE_VIRTUAL) return;
    const c = containerRef.current;
    if (!c) return;
    const id = requestAnimationFrame(() => {
      const unit = getUnit();
      if (unit > 0) c.scrollTop = unit * middleStart;
    });
    return () => cancelAnimationFrame(id);
  }, [USE_VIRTUAL, N, middleStart]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  useEffect(() => {
    if (!USE_VIRTUAL) return;
    const c = containerRef.current;
    if (!c || !firstItemRef.current || N === 0) return;
    const onScroll = () => {
      const unit = getUnit();
      if (unit <= 0) return;
      const copyH = unit * N;
      const total = copyH * 3;
      const topBoundary = copyH * 0.5;
      const bottomBoundary = total - c.clientHeight - topBoundary;
      if (c.scrollTop <= topBoundary) c.scrollTop += copyH;
      else if (c.scrollTop >= bottomBoundary) c.scrollTop -= copyH;
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [USE_VIRTUAL, N]);

  if (!N) {
    return (
      <div className="w-[140px] h-[140px] rounded-xl border bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
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
        "relative max-h-[70vh] md:max-h-[76vh] overflow-y-auto",
        "pl-4 pr-4 md:pl-6 md:pr-5 py-1 md:py-2",
        "flex md:flex-col gap-5 md:gap-6",
        "[scrollbar-width:none] [-ms-overflow-style:none]",
        "[&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:bg-transparent",
      ].join(" ")}
    >
      {list.map(({ url, orig, vIndex }) => {
        const isMiddle =
          USE_VIRTUAL ? vIndex >= middleStart && vIndex < middleStart + N : true;
        const active = isMiddle && orig === selected;

        const ref =
          (!USE_VIRTUAL && vIndex === 0) || (USE_VIRTUAL && vIndex === middleStart)
            ? firstItemRef
            : active
            ? activeRef
            : undefined;

        const qs = new URLSearchParams();
        qs.set("img", String(orig));
        if (color) qs.set("color", color);

        return (
          <Link
            key={`${vIndex}-${orig}`}
            href={`/product/${slug}?${qs.toString()}`}
            prefetch
            aria-current={active ? "true" : undefined}
            aria-label={`Preview ${orig + 1}`}
            aria-selected={active}
            role="listitem"
            ref={ref as any}
            className={[
              "group block select-none overflow-hidden", // ✅ 让边框和内容贴合
              "w-[140px] md:w-[160px] shrink-0",
              // ✅ 去掉 ring-offset，避免黑边与图片间的白色间隙
              active
                ? "ring-2 ring-neutral-900"
                : "ring-1 ring-neutral-300 hover:ring-neutral-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/80 focus-visible:ring-offset-0",
            ].join(" ")}
          >
            <div className={`${THUMB_ASPECT} overflow-hidden bg-white relative`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${title} preview ${orig + 1}`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
