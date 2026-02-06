// src/components/home/HomeImageCarousel.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HomeImageCarouselProps = {
  urls: string[];
  alt: string;
};

export default function HomeImageCarousel({ urls, alt }: HomeImageCarouselProps) {
  const [idx, setIdx] = useState(0);
  const count = urls.length;

  useEffect(() => {
    setIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls?.join("|")]);

  if (!count) {
    return (
      <div className="aspect-[1/1] w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
        No Image
      </div>
    );
  }

  const go = (delta: number) => setIdx((i) => (i + delta + count) % count);

  return (
    <div className="relative aspect-[1/1] w-full bg-muted overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} src={urls[idx]} className="h-full w-full object-cover" loading="lazy" />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white/85 hover:bg-white shadow p-1 z-20"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-4 w-4 text-neutral-800" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white/85 hover:bg-white shadow p-1 z-20"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-4 w-4 text-neutral-800" />
          </button>
        </>
      )}
    </div>
  );
}
