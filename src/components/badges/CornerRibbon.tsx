// src/components/badges/CornerRibbon.tsx
import React from "react";
import { cn } from "@/lib/utils";

type CornerRibbonProps = {
  text: string; // NEW / SALE / HOT / LIMITED
  className?: string;

  /** 展示形态
   * - corner: 角标（默认）
   * - top: 顶部横条（占据图片上方空白区域）
   */
  variant?: "corner" | "top";

  placement?: "top-left" | "top-right"; // corner 模式使用
  size?: "sm" | "md" | "lg"; // corner 模式使用
  tone?: "new" | "sale" | "hot" | "neutral";

  /** corner 模式：离边缘的内缩 */
  inset?: "none" | "sm" | "md";

  /** corner 模式：是否加呼吸动画 */
  pulse?: boolean;

  /** top 模式：区域总高度（px），默认 44 */
  height?: number;

  /** top 模式：背景是否加一点玻璃感（可选） */
  glass?: boolean;

  /** top 模式：横条是否呼吸（默认 true） */
  bannerPulse?: boolean;

  /** top 模式：顶部留白（不压圆角），默认 10px */
  topGap?: number;
};

export default function CornerRibbon({
  text,
  className,
  variant = "corner",

  placement = "top-left",
  size = "md",
  tone = "new",
  inset = "md",
  pulse = true,

  height = 44,
  glass = false,
  bannerPulse = true,
  topGap = 10,
}: CornerRibbonProps) {
  const toneCls =
    tone === "new"
      ? "bg-black/80 text-white"
      : tone === "sale"
      ? "bg-rose-600/90 text-white"
      : tone === "hot"
      ? "bg-amber-400/95 text-black"
      : "bg-neutral-800/85 text-white";

  // =========================
  // ✅ Top Banner（左右对齐容器宽度 + 纯长方形）
  // =========================
  if (variant === "top") {
    const safeGap = Math.max(0, Math.min(topGap, height - 8));
    const bannerHeight = Math.max(18, height - safeGap);

    return (
      <div
        className={cn(
          "absolute left-0 top-0 z-20 w-full",
          // 仍然要裁切，避免内容跑出容器圆角
          "rounded-none",
          className
        )}
        style={{ height }}
        aria-label={text}
      >
        {/* 可选背景层（一般不需要，避免“黑块更重”） */}
        {glass ? (
          <div className="absolute inset-0 bg-white/35 backdrop-blur-[2px]" />
        ) : null}

        {/* 顶部留白 + 横条从 gap 下面开始 */}
        <div
          className="absolute left-0 right-0"
          style={{ top: safeGap, height: bannerHeight }}
        >
          <div
            className={cn(
              // ✅ 对齐容器（也就是图片容器）的全宽
              "w-full h-full flex items-center justify-center",
              // ✅ 纯长方形：无圆角
              "rounded-none",
              // 质感（轻一点）
              "ring-1 ring-black/10",
              // 文本
              "font-extrabold uppercase",
              "tracking-[0.35em]",
              "text-[12px] sm:text-[13px] md:text-[14px]",
              toneCls,
              // 动画
              bannerPulse ? "animate-[pulse_2.4s_ease-in-out_infinite]" : ""
            )}
          >
            {text}
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // ✅ Corner Ribbon（原来的）
  // =========================
  const pos = placement === "top-right" ? "top-0 right-0" : "top-0 left-0";

  const insetCls =
    inset === "none"
      ? ""
      : inset === "sm"
      ? "translate-x-2 translate-y-2"
      : "translate-x-3 translate-y-3";

  const sizeCls =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
      ? "h-12 w-12 text-[12px]"
      : "h-9 w-9 text-[11px]";

  return (
    <div className={cn("absolute z-20", pos, insetCls, className)}>
      <div
        className={cn(
          "relative overflow-hidden",
          sizeCls,
          "rounded-md shadow-sm ring-1 ring-black/10"
        )}
        aria-label={text}
      >
        <div
          className={cn(
            "absolute left-1/2 top-1/2 w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-45",
            "px-2 py-1 text-center font-extrabold tracking-[0.18em] uppercase",
            toneCls,
            pulse ? "animate-pulse" : ""
          )}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
