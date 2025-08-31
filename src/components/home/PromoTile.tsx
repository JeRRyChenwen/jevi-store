import Link from "next/link";
import React from "react";

const cx = (...cls: Array<string | false | undefined>) =>
  cls.filter(Boolean).join(" ");

export type Align = "left" | "center" | "right";

export type PromoTileProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;   // 小字，比如“25–30% OFF”
  ctaLabel?: string;
  href?: string;
  image: string;      // 背景图（可替换成 Strapi 媒体 URL）
  align?: Align;      // 文案对齐方式
  darkText?: boolean; // 浅色背景时用深色字
  className?: string; // 额外样式
};

export function PromoTile({
  title,
  subtitle,
  eyebrow,
  ctaLabel = "Shop now",
  href = "#",
  image,
  align = "left",
  darkText = false,
  className,
}: PromoTileProps) {
  const contentAlign =
    align === "center" ? "items-center text-center" :
    align === "right"  ? "items-end text-right" :
                         "items-start text-left";

  return (
    <Link
      href={href}
      aria-label={title}
      className={cx(
        "group relative overflow-hidden rounded-2xl shadow-sm",
        "ring-1 ring-black/10 dark:ring-white/10 bg-neutral-200",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        className={cx(
          "absolute inset-0",
          darkText
            ? "bg-gradient-to-t from-white/70 via-white/20 to-transparent"
            : "bg-gradient-to-t from-black/60 via-black/20 to-transparent"
        )}
      />
      <div className={cx("relative z-10 flex h-full w-full p-6 sm:p-8", contentAlign)}>
        <div className="max-w-[32rem] space-y-2">
          {eyebrow && (
            <div className={cx("text-xs font-semibold uppercase tracking-wide",
                                darkText ? "text-neutral-700" : "text-white/80")}>
              {eyebrow}
            </div>
          )}
          <h3 className={cx("font-bold leading-tight text-2xl sm:text-3xl lg:text-4xl",
                            darkText ? "text-neutral-900" : "text-white")}>
            {title}
          </h3>
          {subtitle && (
            <p className={cx("text-sm sm:text-base",
                             darkText ? "text-neutral-700" : "text-white/90")}>
              {subtitle}
            </p>
          )}
          {ctaLabel && (
            <span className={cx(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mt-3 shadow-sm",
              darkText ? "bg-neutral-900 text-white" : "bg-white/95 text-neutral-900",
              "transition-all group-hover:-translate-y-0.5"
            )}>
              {ctaLabel}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
                <path fill="currentColor" d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"/>
              </svg>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
