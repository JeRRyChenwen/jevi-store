// src/app/product/_components/GalleryClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  images: string[];
  title: string;
  slug: string;
  /** 当前选中的大图索引（来自 ?img=） */
  selectedIndex?: number;
};

export default function GalleryClient({
  images,
  title,
  slug,
  selectedIndex = 0,
}: Props) {
  const N = images?.length ?? 0;
  const selected = Math.max(0, Math.min(selectedIndex, Math.max(0, N - 1)));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);

  // 三份虚拟数据（用于无限循环）
  const virtual = useMemo(() => {
    if (!N) return [] as Array<{ url: string; orig: number; vIndex: number }>;
    return Array.from({ length: N * 3 }, (_, i) => ({
      url: images[i % N],
      orig: i % N,
      vIndex: i,
    }));
  }, [N, images]);

  const middleStart = N;

  /** 计算一个缩略图的垂直“步长”，用相邻项 offsetTop 差，最稳 */
  const getUnit = () => {
    const first = firstItemRef.current as HTMLElement | null;
    if (!first) return 0;
    const next = first.nextElementSibling as HTMLElement | null;
    if (next) return Math.max(1, next.offsetTop - first.offsetTop);
    return Math.max(1, first.offsetHeight);
  };

  // 初始定位到中间那份（依赖数组长度固定为 1）
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const id = requestAnimationFrame(() => {
      const unit = getUnit();
      if (unit > 0) c.scrollTop = unit * middleStart;
    });
    return () => cancelAnimationFrame(id);
    // ✅ 依赖数组长度固定为 1（N 与 middleStart 恒等，这里只放 N）
  }, [N]);

  // 选中项滚动到可见（依赖长度固定为 1）
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  // 无限回卷（上下都能回卷；依赖长度固定为 1）
  useEffect(() => {
    const c = containerRef.current;
    if (!c || !firstItemRef.current || N === 0) return;

    const onScroll = () => {
      const unit = getUnit();
      if (unit <= 0) return;

      const copyH = unit * N;                 // 一份数据块的总高度
      const total = copyH * 3;                // 三份总高度
      const topBoundary = copyH * 0.5;        // 顶部缓冲
      const bottomBoundary = total - c.clientHeight - topBoundary; // 底部缓冲

      if (c.scrollTop <= topBoundary) {
        c.scrollTop += copyH;                 // 向上滚过头 → 跳到中份
      } else if (c.scrollTop >= bottomBoundary) {
        c.scrollTop -= copyH;                 // 向下滚过头 → 跳回中份
      }
    };

    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [N]);

  if (!N) {
    return (
      <div className="w-[140px] h-[140px] rounded-xl border bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
        No Image
      </div>
    );
  }

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
      {virtual.map(({ url, orig, vIndex }) => {
        const isMiddle = vIndex >= middleStart && vIndex < middleStart + N;
        const active = isMiddle && orig === selected;

        const ref =
          vIndex === middleStart
            ? firstItemRef
            : active
            ? activeRef
            : undefined;

        return (
          <Link
            key={`${vIndex}-${orig}`}
            href={`/product/${slug}?img=${orig}`}
            prefetch
            aria-current={active ? "true" : undefined}
            aria-label={`Preview ${orig + 1}`}
            aria-selected={active}
            role="listitem"
            ref={ref as any}
            className={[
              "group block select-none",
              "w-[140px] md:w-[160px] shrink-0",
              active
                ? "rounded-2xl ring-2 ring-neutral-900 ring-offset-4 ring-offset-white shadow-lg"
                : "rounded-2xl ring-1 ring-transparent hover:ring-neutral-300 hover:shadow transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/80 focus-visible:ring-offset-4",
            ].join(" ")}
          >
            <div className="aspect-square overflow-hidden rounded-[18px] bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${title} preview ${orig + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
