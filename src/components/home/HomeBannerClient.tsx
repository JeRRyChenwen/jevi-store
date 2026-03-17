// D:\前端练习\social-platform\src\components\home\HomeBannerClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { HomeBannerLite } from "@/lib/strapi";

type Props = {
  banners: HomeBannerLite[];
  intervalMs?: number;
  heightClassName?: string;
  transitionMs?: number;
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

  // 手动操作后暂停自动轮播
  const manualPauseMs = 12000;
  const [manualPauseUntil, setManualPauseUntil] = useState(0);
  const manualPauseUntilRef = useRef(0);
  const isManualPausedNow = () => Date.now() < manualPauseUntilRef.current;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);

  // ✅ 拖拽 / 滑动状态
  const pointerDownRef = useRef(false);
  const pointerStartXRef = useRef(0);
  const pointerStartYRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const pointerMovedRef = useRef(false);

  // 动画锁：防止狂点导致 idx 越界
  const isAnimatingRef = useRef(false);
  const lock = () => (isAnimatingRef.current = true);
  const unlock = () => (isAnimatingRef.current = false);

  // autoplay timer
  const autoTimerRef = useRef<number | null>(null);

  // autoplay token（版本号）+ 最近一次用户动作时间
  const autoTokenRef = useRef(0);
  const lastUserActionAtRef = useRef(0);

  const clearAutoTimer = () => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = null;
  };

  // 一切“会打断自动轮播”的动作都调用这个
  const invalidateAutoPlay = () => {
    autoTokenRef.current += 1; // 让所有旧 callback 失效
    clearAutoTimer();
  };

  const pauseAutoForManual = () => {
    lastUserActionAtRef.current = Date.now();
    const until = Date.now() + manualPauseMs;
    manualPauseUntilRef.current = until;
    setManualPauseUntil(until);
    invalidateAutoPlay();
  };

  // 到点自动恢复 manualPauseUntil
  useEffect(() => {
    if (manualPauseUntil <= 0) return;
    const left = manualPauseUntil - Date.now();
    if (left <= 0) return;

    const t = window.setTimeout(() => {
      setManualPauseUntil(0);
      manualPauseUntilRef.current = 0;
    }, left);

    return () => window.clearTimeout(t);
  }, [manualPauseUntil]);

  const canAutoPlay =
    count > 1 && !reducedMotion && !paused && !isManualPausedNow();

  const scheduleAutoNext = () => {
    if (!canAutoPlay) return;

    const token = ++autoTokenRef.current;

    clearAutoTimer();
    autoTimerRef.current = window.setTimeout(() => {
      if (token !== autoTokenRef.current) return;
      if (isManualPausedNow()) return;
      if (paused) return;
      if (isAnimatingRef.current) return;

      // ✅ 防止“刚手动 next -> 又立刻自动 next”造成突兀/双动画
      if (Date.now() - lastUserActionAtRef.current < transitionMs + 120) return;

      lock();
      setEnableTransition(true);
      setIdx((p) => p + 1);
    }, intervalMs);
  };

  // 容器宽度（px）
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

    setManualPauseUntil(0);
    manualPauseUntilRef.current = 0;
    invalidateAutoPlay();

    requestAnimationFrame(() => setEnableTransition(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // autoplay：idx / paused / interval 变化就重置计时
  useEffect(() => {
    if (!canAutoPlay) {
      invalidateAutoPlay();
      return;
    }
    scheduleAutoNext();
    return () => invalidateAutoPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoPlay, idx, intervalMs]);

  if (count === 0) return null;

  const realIndex = count <= 1 ? 0 : mod(idx - 1, count);

  const goReal = (real: number) => {
    if (count <= 1) return;
    if (isAnimatingRef.current) return;
    pauseAutoForManual();
    lock();

    setEnableTransition(true);
    setIdx(real + 1);
  };

  const prev = () => {
    if (count <= 1) return;
    if (isAnimatingRef.current) return;
    pauseAutoForManual();
    lock();

    setEnableTransition(true);
    setIdx((p) => p - 1);
  };

  const next = () => {
    if (count <= 1) return;
    if (isAnimatingRef.current) return;
    pauseAutoForManual();
    lock();

    setEnableTransition(true);
    setIdx((p) => p + 1);
  };

  // ✅ 横向拖拽 / 滑动：先做“松手后切页”的稳妥版本
  const resetPointerState = useCallback(() => {
    pointerDownRef.current = false;
    pointerStartXRef.current = 0;
    pointerStartYRef.current = 0;
    pointerIdRef.current = null;
    pointerMovedRef.current = false;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (count <= 1) return;
      if (isAnimatingRef.current) return;

      pointerDownRef.current = true;
      pointerStartXRef.current = e.clientX;
      pointerStartYRef.current = e.clientY;
      pointerIdRef.current = e.pointerId;
      pointerMovedRef.current = false;

      // 先暂停自动轮播，但还不立刻翻页
      pauseAutoForManual();

      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // 某些环境可能不支持，忽略即可
      }
    },
    [count]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;

    const dx = e.clientX - pointerStartXRef.current;
    const dy = e.clientY - pointerStartYRef.current;

    // 只有横向意图明显时，才阻止默认行为，避免和页面纵向滚动打架
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      pointerMovedRef.current = true;
      e.preventDefault();
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDownRef.current) return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) {
        resetPointerState();
        return;
      }

      const dx = e.clientX - pointerStartXRef.current;
      const dy = e.clientY - pointerStartYRef.current;

      const threshold = Math.max(36, Math.min(90, containerW * 0.08));
      const isHorizontalSwipe =
        Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy);

      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // 忽略
      }

      resetPointerState();

      if (!isHorizontalSwipe) return;
      if (isAnimatingRef.current) return;

      if (dx < 0) {
        next();
      } else {
        prev();
      }
    },
    [containerW, next, prev, resetPointerState]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        if (pointerIdRef.current !== null) {
          e.currentTarget.releasePointerCapture?.(pointerIdRef.current);
        }
      } catch {
        // 忽略
      }
      resetPointerState();
    },
    [resetPointerState]
  );

  // ✅ 只处理轨道自身 transitionend + 回跳用 reflow + 双 rAF
  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (count <= 1) return;

    // ✅ 防止冒泡/子元素触发导致执行两次
    if (e.target !== e.currentTarget) return;

    // 到了最左 clone（idx=0） => 瞬间跳到真实最后一张（idx=count）
    if (idx === 0) {
      invalidateAutoPlay();
      setEnableTransition(false);

      requestAnimationFrame(() => {
        const el = trackRef.current;
        if (el) el.getBoundingClientRect(); // force reflow
        setIdx(count);

        requestAnimationFrame(() => {
          setEnableTransition(true);
          unlock();
        });
      });
      return;
    }

    // 到了最右 clone（idx=count+1） => 瞬间跳到真实第一张（idx=1）
    if (idx === count + 1) {
      invalidateAutoPlay();
      setEnableTransition(false);

      requestAnimationFrame(() => {
        const el = trackRef.current;
        if (el) el.getBoundingClientRect(); // force reflow
        setIdx(1);

        requestAnimationFrame(() => {
          setEnableTransition(true);
          unlock();
        });
      });
      return;
    }

    unlock();
  };

  // 兜底：极端情况下 idx 越界，立刻拉回
  useEffect(() => {
    if (count <= 1) return;

    if (idx < 0) {
      invalidateAutoPlay();
      setEnableTransition(false);
      setIdx(count);
      requestAnimationFrame(() => setEnableTransition(true));
      unlock();
    } else if (idx > count + 1) {
      invalidateAutoPlay();
      setEnableTransition(false);
      setIdx(1);
      requestAnimationFrame(() => setEnableTransition(true));
      unlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, count]);

  // 轨道位移：用 px 绝对稳定
  const basePx = -(idx * (containerW || 0));
  const trackStyle: React.CSSProperties = {
    transform: `translate3d(${basePx}px, 0, 0)`,
    transition:
      reducedMotion || !enableTransition
        ? "none"
        : `transform ${transitionMs}ms ease`,
    willChange: "transform",
  };

  // 进度条：每次 realIndex / paused 变化，重置动画
  const progressKey = `${realIndex}-${paused ? "p" : "r"}`;

  return (
    <section className="w-full">
      <div className="w-full">
        {/* ✅ 图片占满宽度，左右箭头 absolute “凸出去”，不占图片宽 */}
        <div className="relative w-full overflow-visible">
          <div
            ref={containerRef}
            className={[
              "relative w-full overflow-hidden rounded-3xl border bg-white shadow-sm",
              "ring-1 ring-black/5",
              heightClassName,
              "select-none touch-pan-y",
            ].join(" ")}
            onMouseEnter={() => {
              setPaused(true);
              invalidateAutoPlay();
            }}
            onMouseLeave={() => {
              setPaused(false);
              scheduleAutoNext();
            }}
            onFocus={() => {
              setPaused(true);
              invalidateAutoPlay();
            }}
            onBlur={() => {
              setPaused(false);
              scheduleAutoNext();
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            aria-label="Home hero carousel"
            role="region"
          >
            <div
              ref={trackRef}
              className="absolute inset-0 flex h-full"
              style={trackStyle}
              onTransitionEnd={onTransitionEnd}
            >
              {loopSlides.map((s, i) => {
                // ✅ 你的 Strapi slides 目前只有 image_desktop（mobile 不存在也没关系）
                const desktopSrc = s?.image_desktop_url || "";
                const mobileSrc = s?.image_mobile_url || ""; // 如果你在 fetch 里 fallback，这里就会等于 desktop

                return (
                  <div
                    key={`${s.documentId || "x"}-${i}`}
                    className="relative h-full basis-full shrink-0 bg-neutral-100"
                  >
                    <picture>
                      {mobileSrc ? (
                        <source media="(max-width: 640px)" srcSet={mobileSrc} />
                      ) : null}

                      {/* ✅ desktopSrc 必须有；没有的话用空字符串避免报错，但你服务端应已过滤 */}
                      <img
                        src={desktopSrc}
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
                          <div className="flex h-full items-end pb-8 sm:pb-10">
                            <div className="max-w-[680px]">
                              {s.title ? (
                                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
                                  {s.title}
                                </h2>
                              ) : null}

                              {s.subtitle ? (
                                <p className="mt-2 text-sm text-neutral-700 sm:text-base">
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
                );
              })}
            </div>
          </div>

          {/* ✅ 左右箭头：图片外侧 + 更远一点 */}
          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous banner"
                onClick={prev}
                className={[
                  "hidden sm:inline-flex",
                  "absolute top-1/2 -translate-y-1/2",
                  "-left-16",
                  "h-10 w-10 items-center justify-center",
                  "rounded-full border border-neutral-200 bg-white/80",
                  "text-neutral-500 hover:bg-white hover:text-neutral-700",
                  "shadow-sm",
                ].join(" ")}
              >
                <span className="text-xl leading-none">‹</span>
              </button>

              <button
                type="button"
                aria-label="Next banner"
                onClick={next}
                className={[
                  "hidden sm:inline-flex",
                  "absolute top-1/2 -translate-y-1/2",
                  "-right-16",
                  "h-10 w-10 items-center justify-center",
                  "rounded-full border border-neutral-200 bg-white/80",
                  "text-neutral-500 hover:bg-white hover:text-neutral-700",
                  "shadow-sm",
                ].join(" ")}
              >
                <span className="text-xl leading-none">›</span>
              </button>
            </>
          ) : null}
        </div>

        {/* ✅ 控制区：图片下面（图片外），并且和下面卡片拉开距离 */}
        {count > 1 ? (
          <div className="mb-10 mt-5 flex justify-center px-4">
            <div className="rounded-full bg-white/70 px-4 py-2 shadow-sm ring-1 ring-black/10 backdrop-blur-md">
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
                      className="group relative h-2 w-10 overflow-hidden rounded-full bg-black/10"
                    >
                      {active ? (
                        <span
                          key={progressKey}
                          className="absolute left-0 top-0 h-full w-full origin-left scale-x-0 bg-neutral-900/70"
                          style={{
                            animation:
                              paused || reducedMotion || isManualPausedNow()
                                ? "none"
                                : `heroProgress ${intervalMs}ms linear forwards`,
                          }}
                        />
                      ) : null}
                      <span className="absolute inset-0 rounded-full ring-1 ring-transparent group-hover:ring-black/10" />
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
                      "grid h-7 w-7 place-items-center rounded-full transition-colors",
                      i === realIndex
                        ? "bg-neutral-900/10"
                        : "hover:bg-black/5",
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
