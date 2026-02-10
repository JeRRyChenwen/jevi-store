// D:\前端练习\social-platform\src\components\home\HomeBannerClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { HomeBannerLite } from "@/lib/strapi";

type Props = {
  banners: HomeBannerLite[];
  intervalMs?: number;
  heightClassName?: string;
  transitionMs?: number;
  transitionThreshold?: number;
  swipeThreshold?: number;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export default function HomeHeroCarouselClient({
  banners,
  intervalMs = 8000,
  heightClassName = "h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px]",
  transitionMs = 650,
  swipeThreshold: swipeThresholdProp = 0.18,
  transitionThreshold,
}: Props) {
  const swipeThreshold = transitionThreshold ?? swipeThresholdProp;

  const slides = useMemo(() => (banners ?? []).filter(Boolean), [banners]);
  const count = slides.length;

  const reducedMotion = usePrefersReducedMotion();

  const loopSlides = useMemo(() => {
    if (count <= 1) return slides;
    const first = slides[0];
    const last = slides[count - 1];
    return [last, ...slides, first];
  }, [slides, count]);

  const [idx, setIdx] = useState(count > 1 ? 1 : 0);
  const [enableTransition, setEnableTransition] = useState(true);

  const [paused, setPaused] = useState(false);

  // 拖动相关
  const [dragging, setDragging] = useState(false);
  const [dragDx, setDragDx] = useState(0);
  const startXRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);

  // ✅ setTimeout（一次性）实现：可暂停 + 重置计时
  const autoTimerRef = useRef<number | null>(null);

  const canAutoPlay = count > 1 && !reducedMotion && !paused;

  const clearAutoTimer = () => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = null;
  };

  const scheduleAutoNext = () => {
    if (!canAutoPlay) return;
    clearAutoTimer();
    autoTimerRef.current = window.setTimeout(() => {
      setEnableTransition(true);
      setIdx((p) => p + 1);
    }, intervalMs);
  };

  // 容器宽度
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerW(el.clientWidth || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // banners 改变时重置
  useEffect(() => {
    setEnableTransition(false);
    setIdx(count > 1 ? 1 : 0);
    requestAnimationFrame(() => setEnableTransition(true));
  }, [count]);

  // ✅ autoplay：只要 idx/paused/canAutoPlay 变化，就重新计时
  useEffect(() => {
    if (!canAutoPlay) {
      clearAutoTimer();
      return;
    }
    scheduleAutoNext();
    return () => clearAutoTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoPlay, idx, intervalMs]);

  if (count === 0) return null;

  const realIndex = count <= 1 ? 0 : mod(idx - 1, count);

  // ✅ 预加载：当前/前/后 真实 index
  const prevReal = count <= 1 ? 0 : mod(realIndex - 1, count);
  const nextReal = count <= 1 ? 0 : mod(realIndex + 1, count);

  // ✅ JS 预加载相邻两张（desktop + mobile）
  useEffect(() => {
    if (count <= 1) return;

    const urls: string[] = [];
    const pick = (r: number) => slides[r];

    for (const r of [prevReal, realIndex, nextReal]) {
      const s = pick(r);
      if (!s) continue;
      if (s.image_desktop_url) urls.push(s.image_desktop_url);
      if (s.image_mobile_url) urls.push(s.image_mobile_url);
    }

    const imgs: HTMLImageElement[] = [];
    for (const u of urls) {
      const img = new Image();
      img.decoding = "async";
      img.src = u;
      imgs.push(img);
    }

    // 不需要清理也行；这里留着以免极端情况占用太多
    return () => {
      imgs.forEach((img) => {
        // 释放引用
        // @ts-ignore
        img.src = "";
      });
    };
  }, [count, slides, realIndex, prevReal, nextReal]);

  const goReal = (real: number) => {
    if (count <= 1) return;
    setEnableTransition(true);
    setIdx(real + 1);
    scheduleAutoNext();
  };

  const prev = () => {
    if (count <= 1) return;

    setIdx((p) => {
      const nextIdx = p - 1;
      if (nextIdx < 0) {
        setEnableTransition(false);
        requestAnimationFrame(() => setEnableTransition(true));
        return count;
      }
      setEnableTransition(true);
      return nextIdx;
    });

    scheduleAutoNext();
  };

  const next = () => {
    if (count <= 1) return;

    setIdx((p) => {
      const nextIdx = p + 1;
      if (nextIdx > count + 1) {
        setEnableTransition(false);
        requestAnimationFrame(() => setEnableTransition(true));
        return 1;
      }
      setEnableTransition(true);
      return nextIdx;
    });

    scheduleAutoNext();
  };

  const onTransitionEnd = () => {
    if (count <= 1) return;

    if (idx === 0) {
      setEnableTransition(false);
      setIdx(count);
      requestAnimationFrame(() => setEnableTransition(true));
      return;
    }
    if (idx === count + 1) {
      setEnableTransition(false);
      setIdx(1);
      requestAnimationFrame(() => setEnableTransition(true));
      return;
    }
  };

  // ✅ 兜底：transitionend 丢失也强制拉回
  useEffect(() => {
    if (count <= 1) return;

    if (idx < 0) {
      setEnableTransition(false);
      setIdx(count);
      requestAnimationFrame(() => setEnableTransition(true));
      return;
    }
    if (idx > count + 1) {
      setEnableTransition(false);
      setIdx(1);
      requestAnimationFrame(() => setEnableTransition(true));
      return;
    }
  }, [idx, count]);

  // ===== 拖动 =====
  const onPointerDown = (e: React.PointerEvent) => {
    if (count <= 1) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    clearAutoTimer();

    setDragging(true);
    setEnableTransition(false);
    setDragDx(0);
    startXRef.current = e.clientX;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const startX = startXRef.current;
    if (startX == null) return;
    setDragDx(e.clientX - startX);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);

    const w = containerW || containerRef.current?.clientWidth || 0;
    const dx = dragDx;

    setDragDx(0);
    startXRef.current = null;

    setEnableTransition(true);

    if (w) {
      const ratio = Math.abs(dx) / w;
      if (ratio >= swipeThreshold) {
        if (dx < 0) next();
        else prev();
        return;
      }
    }

    scheduleAutoNext();
  };

  const basePx = -(idx * (containerW || 0));
  const trackStyle: React.CSSProperties = {
    transform: `translate3d(${basePx + dragDx}px, 0, 0)`,
    transition:
      dragging || reducedMotion || !enableTransition
        ? "none"
        : `transform ${transitionMs}ms ease`,
    willChange: "transform",
  };

  // ✅ 让“正在看的 + 相邻两张”更积极加载（避免拖动半途空白）
  const isNearLoopIndex = (i: number) => {
    if (count <= 1) return true;
    // loop 索引：真实 realIndex 对应 loop idx = realIndex + 1
    const cur = realIndex + 1;
    return i === cur || i === cur - 1 || i === cur + 1;
  };

  return (
    <section className="w-full">
      <div
        ref={containerRef}
        className={[
          "relative overflow-hidden rounded-3xl border bg-white shadow-sm",
          "ring-1 ring-black/5",
          heightClassName,
          "select-none",
        ].join(" ")}
        onMouseEnter={() => {
          setPaused(true);
          clearAutoTimer();
        }}
        onMouseLeave={() => {
          setPaused(false);
          scheduleAutoNext();
        }}
        onFocus={() => {
          setPaused(true);
          clearAutoTimer();
        }}
        onBlur={() => {
          setPaused(false);
          scheduleAutoNext();
        }}
      >
        <div
          className="absolute inset-0"
          style={{ touchAction: "pan-y" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => {
            if (dragging) endDrag();
          }}
          aria-label="Home hero carousel"
          role="region"
        >
          <div
            className="flex h-full w-full"
            style={trackStyle}
            onTransitionEnd={onTransitionEnd}
          >
            {loopSlides.map((s, i) => (
              <div
                key={`${s.documentId || "x"}-${i}`}
                className="relative h-full w-full shrink-0 bg-neutral-100" // ✅ 就算图片没到，也不是白屏
              >
                <picture>
                  {s.image_mobile_url ? (
                    <source media="(max-width: 640px)" srcSet={s.image_mobile_url} />
                  ) : null}
                  <img
                    src={s.image_desktop_url}
                    alt={s.title || "Banner"}
                    className="h-full w-full object-cover object-bottom"
                    // ✅ 当前/相邻：eager；其它：lazy
                    loading={isNearLoopIndex(i) ? "eager" : "lazy"}
                    decoding="async"
                    // @ts-ignore - 某些 TS 版本不认识这个属性，但浏览器支持
                    fetchPriority={isNearLoopIndex(i) ? "high" : "auto"}
                    draggable={false}
                  />
                </picture>

                <div className="absolute inset-0 bg-white/0" />

                {count > 1 ? (
                  i === idx ? (
                    <div className="absolute inset-0 z-10 h-full w-full px-5 sm:px-8">
                      <div className="h-full flex items-end pb-8 sm:pb-10">
                        <div className="max-w-[680px]">
                          {s.title ? (
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
                              {s.title}
                            </h2>
                          ) : null}

                          {s.subtitle ? (
                            <p className="mt-2 text-sm sm:text-base text-neutral-700">
                              {s.subtitle}
                            </p>
                          ) : null}

                          {s.cta_href && s.cta_href !== "#" ? (
                            <div className="mt-4">
                              <Link
                                href={s.cta_href}
                                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5"
                                aria-label={s.cta_label || "Shop now"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scheduleAutoNext();
                                }}
                              >
                                {s.cta_label || "Shop now"}
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-90">
                                  <path
                                    fill="currentColor"
                                    d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"
                                  />
                                </svg>
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {count > 1 ? (
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={slides[i].documentId || String(i)}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => goReal(i)}
                className={[
                  "h-2.5 w-2.5 rounded-full ring-1 ring-black/10",
                  i === realIndex ? "bg-neutral-900" : "bg-white/90 hover:bg-white",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
