// src/app/product/_components/GalleryClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

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
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // 选中缩略图滚动到可见
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedIndex]);

  if (!images || images.length === 0) {
    return (
      <div className="w-[140px] h-[140px] rounded-xl border bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
        No Image
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      aria-label="Product image thumbnails"
      className="
        relative
        max-h-[70vh] md:max-h-[76vh]
        overflow-y-auto
        pr-2 md:pr-3 py-1 md:py-2
        flex md:block
        gap-5 md:gap-6
      "
    >
      {images.map((u, i) => {
        const active = i === selectedIndex;
        return (
          <Link
            key={i}
            href={`/product/${slug}?img=${i}`}
            prefetch
            aria-current={active ? "true" : undefined}
            aria-label={`Preview ${i + 1}`}
            ref={active ? activeRef : null}
            className={[
              "group block select-none mx-auto",
              "w-[140px] md:w-[160px]", // 缩略图更宽
              active
                ? "rounded-2xl ring-2 ring-neutral-900 ring-offset-4 ring-offset-white shadow-lg"
                : "rounded-2xl ring-1 ring-transparent hover:ring-neutral-300 hover:shadow transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/80 focus-visible:ring-offset-4",
            ].join(" ")}
          >
            <div className="aspect-square overflow-hidden rounded-[18px] bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={`${title} preview ${i + 1}`}
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
