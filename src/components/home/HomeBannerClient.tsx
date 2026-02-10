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

export default function HomeBannerClient({
  banners,
  intervalMs = 8000,
  heightClassName = "h-[320px] sm:h-[380px] md:h-[460px] lg:h-[520px]",
  transitionMs = 650,
}: Props) {
  const slides = useMemo(() => (banners ?? []).filter(Boolean), [banners]);
  const count = slides.length;

  const reducedMotion = usePrefersReducedMotion();

  // loop: [last, ...slides, first]
  const loopSlides = useMemo(() => {
    if (count <= 1) return slides;
    return [slides[count - 1], ...slides, slides[0]];
  }, [slides, count]);

  // idx 是 loop 索引：1..count 对应真实 slides 0..count-1
  const [idx, setIdx] = useState(count > 1 ? 1 : 0);
  const [enableTransition, setEnableTransition] = useState(true);

  const [paused, setPaused] = useState(false);

  // ✅ 手动操作后暂停自动轮播（ms）
  const manualPauseMs = 12000;

  // ✅ 用 ref 让“暂停”立刻生效（避免 scheduleAutoNext 读到旧 state）
  const manualPauseUntilRef = useRef(0);
  const [manualPauseUntil, setManualPauseUntil] = useState(0);

  // 容器尺寸
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);

  // ✅ 动画锁：防止狂点导致 idx 乱套/越界
  const isAnimatingRef = useRef(false);
  const lock = () => (isAnimatingRef.current = true);
  const unlock = () => (isAnimatingRef.current = false);

  // autoplay：一次性 setTimeout（便于重置）
  const autoTimerRef = useRef<number | null>(null);

  const clearAutoTimer = () => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = null;
  };

  const pauseAutoForManual = () => {
    const until = Date.now() + manualPauseMs;
    manualPauseUntilRef.current = until;
    setManualPauseUntil(until);
    clearAutoTimer();
  };

  // 到点自动恢复（只负责把 state/ref 拉回）
  useEffect(() => {
    if (manualPauseUntil <= 0) return;
    const left = manualPauseUntil - Date.now();
    if (left <= 0) return;

    const t = window.setTimeout(() => {
      manualPauseUntilRef.current = 0;
      setManualPauseUntil(0);
    }, left);

    return () => window.clearTimeout(t);
  }, [manualPauseUntil]);

  const scheduleAutoNext = () => {
    // ✅ 这里不要依赖闭包里的 canAutoPlay（可能是旧值），而是当场重新算
    const isManualPausedNow = manualPauseUntilRef.current > Date.now();
    const canAutoPlayNow =
      count > 1 && !reducedMotion && !paused && !isManualPausedNow;

    if (!canAutoPlayNow) return;

    clearAutoTimer();
    autoTimerRef.current = window.setTimeout(() => {
      if (isAnimatingRef.current) return;
      lock();
      setEnableTransition(true);
      setIdx((p) => p + 1);
    }, intervalMs);
  };

  // ✅ 容器宽度（px）
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
    unlock();
    setEnableTransition(false);
    setIdx(count > 1 ? 1 : 0);
    requestAnimationFrame(() => setEnableTransition(true));
  }, [count]);

  // autoplay：idx / paused / interval / manualPause 变化就重置计时
  useEffect(() => {
    clearAutoTimer();
    scheduleAutoNext();
    return () => clearAutoTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused, intervalMs, reducedMotion, count, manualPauseUntil]);

  if (count === 0) return null;

  const realIndex = count <= 1 ? 0 : mod(idx - 1, count);

  const goReal = (real: number) => {
    if (count <= 1) return;
    if (isAnimatingRef.current) return;

    pauseAutoForManual();
    lock();
    setEnableTransition(true);
    setIdx(real + 1);
    scheduleAutoNext();
  };

  const prev = () => {
    if (count <= 1) return;
    if (isAnimatingRef.current) return;

    pauseAutoForManual();
    lock();
    setEnableTransition(true);
    setIdx((p) => p - 1);
    scheduleAutoNext();
  };

  const next = () => {
    if (count <= 1) return;
    if (isAnimatingRef.current) return;

    pauseAutoForManual();
    lock();
    setEnableTransition(true);
    setIdx((p) => p + 1);
    scheduleAutoNext();
  };

  // ✅ 关键修复：clone -> 真图 的 snap 必须“无动画瞬移”
  // 用双 requestAnimationFrame 确保：
  // 1) transition 先关闭并落地
  // 2) idx 再改变（瞬移）
  // 3) transition 再打开
  const snapTo = (targetIdx: number) => {
    setEnableTransition(false);
    requestAnimationFrame(() => {
      setIdx(targetIdx);
      requestAnimationFrame(() => {
        setEnableTransition(true);
        unlock();
      });
    });
  };

  const onTransitionEnd = () => {
    if (count <= 1) return;

    // 到了最左 clone（idx=0） => 瞬移到真实最后一张（idx=count）
    if (idx === 0) {
      snapTo(count);
      return;
    }

    // 到了最右 clone（idx=count+1） => 瞬移到真实第一张（idx=1）
    if (idx === count + 1) {
      snapTo(1);
      return;
    }

    unlock();
  };

  // ✅ 额外兜底：极端情况下 idx 越界，立刻拉回（防白屏）
  useEffect(() => {
    if (count <= 1) return;

    if (idx < 0) {
      snapTo(count);
      return;
    }
    if (idx > count + 1) {
      snapTo(1);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, count]);

  // ✅ 轨道位移：用 px 绝对稳定
  const basePx = -(idx * (containerW || 0));
  const trackStyle: React.CSSProperties = {
    transform: `translate3d(${basePx}px, 0, 0)`,
    transition:
      reducedMotion || !enableTransition
        ? "none"
        : `transform ${transitionMs}ms ease`,
    willChange: "transform",
  };

  // 进度条：每次 realIndex 或 paused 变化，重置动画
  const progressKey = `${realIndex}-${paused ? "p" : "r"}`;

  return (
    <section className="w-full">
      <div className="w-full">
        <div className="mx-auto flex w-full items-center gap-3">
          {/* 左箭头：图片之外，浅灰 */}
          {count > 1 ? (
            <button
              type="button"
              aria-label="Previous banner"
              onClick={prev}
              className={[
                "hidden sm:inline-flex",
                "h-10 w-10 items-center justify-center",
                "rounded-full border border-neutral-200 bg-white/80",
                "text-neutral-500 hover:text-neutral-700 hover:bg-white",
                "shadow-sm",
              ].join(" ")}
            >
              <span className="text-xl leading-none">‹</span>
            </button>
          ) : (
            <div className="hidden sm:block w-10" />
          )}

          {/* 图片容器 */}
          <div
            ref={containerRef}
            className={[
              "relative flex-1 overflow-hidden rounded-3xl border bg-white shadow-sm",
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
            aria-label="Home hero carousel"
            role="region"
          >
            {/* 轨道 */}
            <div
              className="absolute inset-0 flex h-full"
              style={trackStyle}
              onTransitionEnd={onTransitionEnd}
            >
              {loopSlides.map((s, i) => (
                <div
                  key={`${s.documentId || "x"}-${i}`}
                  className="relative h-full basis-full shrink-0 bg-neutral-100"
                >
                  <picture>
                    {s.image_mobile_url ? (
                      <source
                        media="(max-width: 640px)"
                        srcSet={s.image_mobile_url}
                      />
                    ) : null}
                    <img
                      src={s.image_desktop_url}
                      alt={s.title || "Banner"}
                      className="h-full w-full object-cover object-bottom"
                      loading={i === idx ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                    />
                  </picture>

                  <div className="absolute inset-0 bg-white/0" />

                  {/* 内容层：只在当前 idx 显示 */}
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
                                    // ✅ CTA 也算用户主动操作：暂停 autoplay，避免突兀跳走
                                    pauseAutoForManual();
                                  }}
                                >
                                  {s.cta_label || "Shop now"}
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    className="opacity-90"
                                  >
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

            {/* 底部控制条 */}
            {count > 1 ? (
              <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center px-4">
                <div className="rounded-full bg-white/70 backdrop-blur-md ring-1 ring-black/10 shadow-sm px-4 py-2">
                  {/* 进度条 */}
                  <div className="flex items-center justify-center gap-2">
                    {slides.map((_, i) => {
                      const active = i === realIndex;
                      return (
                        <button
                          key={`bar-${slides[i].documentId || i}`}
                          type="button"
                          aria-label={`Go to banner ${i + 1}`}
                          onClick={() => goReal(i)}
                          className="group relative h-2 w-10 rounded-full bg-black/10 overflow-hidden"
                        >
                          {active ? (
                            <span
                              key={progressKey}
                              className="absolute left-0 top-0 h-full w-full origin-left scale-x-0 bg-neutral-900/70"
                              style={{
                                animation:
                                  paused || reducedMotion
                                    ? "none"
                                    : `heroProgress ${intervalMs}ms linear forwards`,
                              }}
                            />
                          ) : null}
                          <span className="absolute inset-0 ring-1 ring-transparent group-hover:ring-black/10 rounded-full" />
                        </button>
                      );
                    })}
                  </div>

                  {/* dots：更大命中面积 */}
                  <div className="mt-2 flex justify-center gap-2">
                    {slides.map((_, i) => (
                      <button
                        key={slides[i].documentId || String(i)}
                        type="button"
                        aria-label={`Go to banner ${i + 1}`}
                        onClick={() => goReal(i)}
                        className={[
                          "h-7 w-7 grid place-items-center rounded-full",
                          "transition-colors",
                          i === realIndex ? "bg-neutral-900/10" : "hover:bg-black/5",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "block h-3 w-3 rounded-full ring-1 ring-black/10",
                            i === realIndex ? "bg-neutral-900" : "bg-white",
                          ].join(" ")}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 右箭头：图片之外，浅灰 */}
          {count > 1 ? (
            <button
              type="button"
              aria-label="Next banner"
              onClick={next}
              className={[
                "hidden sm:inline-flex",
                "h-10 w-10 items-center justify-center",
                "rounded-full border border-neutral-200 bg-white/80",
                "text-neutral-500 hover:text-neutral-700 hover:bg-white",
                "shadow-sm",
              ].join(" ")}
            >
              <span className="text-xl leading-none">›</span>
            </button>
          ) : (
            <div className="hidden sm:block w-10" />
          )}
        </div>

        <style jsx>{`
          @keyframes heroProgress {
            from {
              transform: scaleX(0);
            }
            to {
              transform: scaleX(1);
            }
          }
        `}</style>
      </div>
    </section>
  );
}
