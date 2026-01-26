"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ImageCarouselProps = {
  urls: string[];
  alt: string;
};

export default function ImageCarousel({ urls, alt }: ImageCarouselProps) {
  const [idx, setIdx] = useState(0);
  const count = urls.length;

  useEffect(() => {
    setIdx(0);
  }, [urls?.join("|")]);

  if (!count) {
    return (
      <div className="h-[260px] sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px] bg-muted flex items-center justify-center text-muted-foreground">
        No Image
      </div>
    );
  }

  const go = (delta: number) => setIdx((i) => (i + delta + count) % count);

  return (
    <div className="relative h-[260px] sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px] bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} src={urls[idx]} className="h-full w-full object-cover" loading="lazy" />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow p-1 z-20"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-5 w-5 text-neutral-800" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow p-1 z-20"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-5 w-5 text-neutral-800" />
          </button>
        </>
      )}
    </div>
  );
}
