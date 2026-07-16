"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ImageCarouselProps = {
  urls: string[];
  alt: string;
};

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export default function ImageCarousel({ urls, alt }: ImageCarouselProps) {
  const count = urls.length;

  // ✅ loop 索引：
  // count > 1 时，真实第 1 张对应 idx=1
  // [最后一张clone, ...原图, 第一张clone]
  const loopSlides = useMemo(() => {
    if (count <= 1) return urls;
    return [urls[count - 1], ...urls, urls[0]];
  }, [urls, count]);

  const [idx, setIdx] = useState(count > 1 ? 1 : 0);
  const [enableTransition, setEnableTransition] = useState(true);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ✅ 拖拽 / 滑动状态
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    setEnableTransition(false);
    setIdx(count > 1 ? 1 : 0);

    requestAnimationFrame(() => {
      setEnableTransition(true);
    });
  }, [urls?.join("|"), count]);

  const realIndex = count <= 1 ? 0 : mod(idx - 1, count);

  const prev = useCallback(() => {
    if (count <= 1) return;
    setEnableTransition(true);
    setIdx((p) => p - 1);
  }, [count]);

  const next = useCallback(() => {
    if (count <= 1) return;
    setEnableTransition(true);
    setIdx((p) => p + 1);
  }, [count]);

  const resetDragState = useCallback(() => {
    dragStartXRef.current = null;
    dragStartYRef.current = null;
    draggingRef.current = false;
  }, []);

  const handleSwipeEnd = useCallback(
    (endX: number, endY: number) => {
      if (count <= 1) {
        resetDragState();
        return;
      }

      const startX = dragStartXRef.current;
      const startY = dragStartYRef.current;

      if (startX == null || startY == null) {
        resetDragState();
        return;
      }

      const dx = endX - startX;
      const dy = endY - startY;

      const width = containerRef.current?.clientWidth ?? 0;
      const threshold = Math.max(28, Math.min(72, width * 0.12));

      const isHorizontalSwipe =
        Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy);

      resetDragState();

      if (!isHorizontalSwipe) return;

      if (dx < 0) {
        next();
      } else {
        prev();
      }
    },
    [count, next, prev, resetDragState],
  );

  // ===== Touch =====
  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (count <= 1) return;
      const t = e.touches[0];
      if (!t) return;

      dragStartXRef.current = t.clientX;
      dragStartYRef.current = t.clientY;
      draggingRef.current = true;
    },
    [count],
  );

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;

    const t = e.touches[0];
    if (!t) return;

    const startX = dragStartXRef.current;
    const startY = dragStartYRef.current;
    if (startX == null || startY == null) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const t = e.changedTouches[0];
      if (!t) {
        resetDragState();
        return;
      }
      handleSwipeEnd(t.clientX, t.clientY);
    },
    [handleSwipeEnd, resetDragState],
  );

  const onTouchCancel = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  // ===== Mouse =====
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (count <= 1) return;
      if (e.button !== 0) return;

      dragStartXRef.current = e.clientX;
      dragStartYRef.current = e.clientY;
      draggingRef.current = true;
    },
    [count],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      handleSwipeEnd(e.clientX, e.clientY);
    },
    [handleSwipeEnd],
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      handleSwipeEnd(e.clientX, e.clientY);
    },
    [handleSwipeEnd],
  );

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    if (e.target !== e.currentTarget) return;

    // 到了最左 clone => 瞬移到真实最后一张
    if (idx === 0) {
      setEnableTransition(false);
      requestAnimationFrame(() => {
        const el = trackRef.current;
        if (el) el.getBoundingClientRect();
        setIdx(count);

        requestAnimationFrame(() => {
          setEnableTransition(true);
        });
      });
      return;
    }

    // 到了最右 clone => 瞬移到真实第一张
    if (idx === count + 1) {
      setEnableTransition(false);
      requestAnimationFrame(() => {
        const el = trackRef.current;
        if (el) el.getBoundingClientRect();
        setIdx(1);

        requestAnimationFrame(() => {
          setEnableTransition(true);
        });
      });
    }
  };

  if (!count) {
    return (
      <div className="flex h-[260px] items-center justify-center bg-muted text-muted-foreground sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px]">
        No Image
      </div>
    );
  }

  const trackStyle: React.CSSProperties = {
    width: `${loopSlides.length * 100}%`,
    transform: `translateX(-${idx * (100 / loopSlides.length)}%)`,
    transition: enableTransition ? "transform 300ms ease-out" : "none",
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[260px] overflow-hidden bg-muted select-none sm:h-[300px] md:h-[340px] lg:h-[380px] xl:h-[420px]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* ✅ 轨道：用 clone 做真正循环，保证首尾切换方向正确 */}
      <div
        ref={trackRef}
        className="flex h-full"
        style={trackStyle}
        onTransitionEnd={onTransitionEnd}
      >
        {loopSlides.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="h-full shrink-0"
            style={{ width: `${100 / loopSlides.length}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={alt}
              src={url}
              className="h-full w-full object-contain p-3"
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow hover:bg-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prev();
            }}
          >
            <ChevronLeft className="h-5 w-5 text-neutral-800" />
          </button>

          <button
            type="button"
            aria-label="Next image"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow hover:bg-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              next();
            }}
          >
            <ChevronRight className="h-5 w-5 text-neutral-800" />
          </button>

          {/* 可选：底部小点，帮助感知当前是第几张 */}
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {urls.map((_, i) => (
              <span
                key={`dot-${i}`}
                className={[
                  "block h-1.5 w-1.5 rounded-full",
                  i === realIndex ? "bg-white" : "bg-white/50",
                ].join(" ")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
