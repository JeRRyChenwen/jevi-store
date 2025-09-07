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
  /** 当前颜色（用于把 color 透传到缩略图链接） */
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

  // 当图片较少时关闭无限循环复制，避免同时看到重复项
  const COPIES = N >= 5 ? 3 : 1;

  // 虚拟数据
  const virtual = useMemo(() => {
    if (!N) return [] as Array<{ url: string; orig: number; vIndex: number }>;
    return Array.from({ length: N * COPIES }, (_, i) => ({
      url: images[i % N],
      orig: i % N,
      vIndex: i,
    }));
  }, [N, images, COPIES]);

  const middleStart = COPIES > 1 ? N : 0;

  const getUnit = () => {
    const first = firstItemRef.current as HTMLElement | null;
    if (!first) return 0;
    const next = first.nextElementSibling as HTMLElement | null;
    if (next) return Math.max(1, next.offsetTop - first.offsetTop);
    return Math.max(1, first.offsetHeight);
  };

  // 初始定位到中间那份（仅在 COPIES>1 时需要）
  useEffect(() => {
    if (COPIES <= 1) return;
    const c = containerRef.current;
    if (!c) return;
    const id = requestAnimationFrame(() => {
      const unit = getUnit();
      if (unit > 0) c.scrollTop = unit * middleStart;
    });
    return () => cancelAnimationFrame(id);
  }, [N, COPIES, middleStart]);

  // 选中项滚动到可见
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  // 无限回卷（仅在 COPIES>1 时启用）
  useEffect(() => {
    if (COPIES <= 1) return;
    const c = containerRef.current;
    if (!c || !firstItemRef.current || N === 0) return;

    const onScroll = () => {
      const unit = getUnit();
      if (unit <= 0) return;

      const copyH = unit * N;
      const total = copyH * COPIES;
      const topBoundary = copyH * 0.5;
      const bottomBoundary = total - c.clientHeight - topBoundary;

      if (c.scrollTop <= topBoundary) c.scrollTop += copyH;
      else if (c.scrollTop >= bottomBoundary) c.scrollTop -= copyH;
    };

    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [N, COPIES]);

  if (!N) {
    return (
      <div className="w-[140px] h-[140px] rounded-xl border bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
        No Image
      </div>
    );
  }

  const hrefFor = (orig: number) => {
    const q = new URLSearchParams();
    if (color) q.set("color", color);
    q.set("img", String(orig));
    return `/product/${slug}?${q.toString()}`;
  };

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
        const isMiddle = COPIES > 1 && vIndex >= middleStart && vIndex < middleStart + N;
        const active = (COPIES > 1 ? isMiddle : true) && orig === selected;

        const ref =
          vIndex === middleStart
            ? firstItemRef
            : active
            ? activeRef
            : undefined;

        return (
          <Link
            key={`${vIndex}-${orig}`}
            href={hrefFor(orig)}
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
