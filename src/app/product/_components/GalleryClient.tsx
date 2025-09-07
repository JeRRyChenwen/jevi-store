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

  // 三份虚拟数据：中间这份用于“主视图”，滚到头/尾时无缝回卷
  const virtual = useMemo(() => {
    if (!N) return [] as Array<{ url: string; orig: number; vIndex: number }>;
    return Array.from({ length: N * 3 }, (_, i) => ({
      url: images[i % N],
      orig: i % N,
      vIndex: i,
    }));
  }, [N, images]);
  const middleStart = N;

  // 初始定位到中间那份
  useEffect(() => {
    const c = containerRef.current;
    const item = firstItemRef.current;
    if (!c || !item) return;
    const gap = parseFloat(getComputedStyle(c).rowGap || "0");
    const unit = item.offsetHeight + gap;
    c.scrollTop = unit * middleStart;
  }, [middleStart]);

  // 选中项滚动到可见
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  // 循环回卷
  useEffect(() => {
    const c = containerRef.current;
    if (!c || !firstItemRef.current || N === 0) return;

    const onScroll = () => {
      const gap = parseFloat(getComputedStyle(c).rowGap || "0");
      const unit = (firstItemRef.current as HTMLElement).offsetHeight + gap;
      const copyH = unit * N;
      const threshold = copyH * 0.25;
      const max = copyH * (3 - 1) - c.clientHeight - threshold;

      if (c.scrollTop < threshold) c.scrollTop += copyH;
      else if (c.scrollTop > max) c.scrollTop -= copyH;
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
        // 容器尺寸/布局
        "relative max-h-[70vh] md:max-h-[76vh] overflow-y-auto",
        "pl-4 pr-4 md:pl-6 md:pr-5 py-1 md:py-2",
        "flex md:flex-col gap-5 md:gap-6",
        // 隐藏滚动条：Firefox/Edge
        "[scrollbar-width:none] [-ms-overflow-style:none]",
        // 隐藏滚动条：WebKit
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
