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

  /** 图片较少时（<4）不做虚拟循环，避免“重复很多张”的观感 */
  const USE_VIRTUAL = N >= 4;

  /** 列表数据：虚拟循环用 3 份，普通模式用 1 份 */
  const list = useMemo(() => {
    if (!N) return [] as Array<{ url: string; orig: number; vIndex: number }>;
    if (!USE_VIRTUAL) {
      // 普通模式：不复制
      return images.map((url, i) => ({ url, orig: i, vIndex: i }));
    }
    // 虚拟模式：复制 3 份
    return Array.from({ length: N * 3 }, (_, i) => ({
      url: images[i % N],
      orig: i % N,
      vIndex: i,
    }));
  }, [N, images, USE_VIRTUAL]);

  /** 中间那份的起始下标（仅虚拟模式有效） */
  const middleStart = USE_VIRTUAL ? N : 0;

  /** 计算单步高度：用相邻两项的 offsetTop 差，最稳（无需访问 document） */
  const getUnit = () => {
    const first = firstItemRef.current as HTMLElement | null;
    if (!first) return 0;
    const next = first.nextElementSibling as HTMLElement | null;
    if (next) return Math.max(1, next.offsetTop - first.offsetTop);
    return Math.max(1, first.offsetHeight);
  };

  /** 首次定位到中间副本（只在虚拟模式下执行） */
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

  /** 选中项滚动到可见 */
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  /** 无限回卷（仅虚拟模式下绑定） */
  useEffect(() => {
    if (!USE_VIRTUAL) return;

    const c = containerRef.current;
    if (!c || !firstItemRef.current || N === 0) return;

    const onScroll = () => {
      const unit = getUnit();
      if (unit <= 0) return;

      const copyH = unit * N; // 一份数据块高度
      const total = copyH * 3; // 三份总高度
      const topBoundary = copyH * 0.5; // 顶部缓冲
      const bottomBoundary = total - c.clientHeight - topBoundary; // 底部缓冲

      if (c.scrollTop <= topBoundary) {
        // 向上滚过头 → 跳到中份
        c.scrollTop += copyH;
      } else if (c.scrollTop >= bottomBoundary) {
        // 向下滚过头 → 跳回中份
        c.scrollTop -= copyH;
      }
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

  return (
    <div
      ref={containerRef}
      aria-label="Product image thumbnails"
      role="list"
      className={[
        "relative max-h-[70vh] md:max-h-[76vh] overflow-y-auto",
        "pl-4 pr-4 md:pl-6 md:pr-5 py-1 md:py-2",
        "flex md:flex-col gap-5 md:gap-6",
        // 隐藏滚动条
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

        // 保留 color 参数，切缩略图不会丢颜色
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
