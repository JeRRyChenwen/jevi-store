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

  /**
   * ✅ NEW:
   * - true（默认）：整张卡可点击（当前行为）
   * - false：只有 CTA 按钮可点击
   */
  cardClickable?: boolean;
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
  cardClickable = true,
}: PromoTileProps) {
  const contentAlign =
    align === "center" ? "items-center text-center" :
    align === "right"  ? "items-end text-right" :
                         "items-start text-left";

  const rootClassName = cx(
    "group relative overflow-hidden rounded-2xl shadow-sm",
    "ring-1 ring-black/10 dark:ring-white/10 bg-neutral-200",
    // ✅ 只有整卡可点时才需要 focus ring（否则会出现莫名其妙的 focus 样式）
    cardClickable ? "focus:outline-none focus:ring-2 focus:ring-primary" : "",
    className
  );

  const content = (
    <>
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        className={cx(
          "absolute inset-0",
          darkText
            ? "bg-white"
            : "bg-gradient-to-t from-black/60 via-black/20 to-transparent"
        )}
      />
      <div className={cx("relative z-10 flex h-full w-full p-6 sm:p-8", contentAlign)}>
        <div className="max-w-[32rem] space-y-2">
          {eyebrow && (
            <div
              className={cx(
                "text-xs font-semibold uppercase tracking-wide",
                darkText ? "text-neutral-700" : "text-white/80"
              )}
            >
              {eyebrow}
            </div>
          )}

          <h3
            className={cx(
              "font-bold leading-tight text-2xl sm:text-3xl lg:text-4xl",
              darkText ? "text-neutral-900" : "text-white"
            )}
          >
            {title}
          </h3>

          {subtitle && (
            <p
              className={cx(
                "text-sm sm:text-base",
                darkText ? "text-neutral-700" : "text-white/90"
              )}
            >
              {subtitle}
            </p>
          )}

          {/* ✅ CTA：cardClickable=true 时 CTA 只是外观（span）；false 时 CTA 才是 Link */}
          {ctaLabel && (
            cardClickable ? (
              <span
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mt-3 shadow-sm",
                  darkText ? "bg-neutral-900 text-white" : "bg-white/95 text-neutral-900",
                  "transition-all group-hover:-translate-y-0.5"
                )}
              >
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
                  <path
                    fill="currentColor"
                    d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"
                  />
                </svg>
              </span>
            ) : (
              // 只有 CTA 可点：CTA 变成 Link（外层是 div，不会嵌套 Link）
              <Link
                href={href}
                aria-label={ctaLabel}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mt-3 shadow-sm",
                  darkText ? "bg-neutral-900 text-white" : "bg-white/95 text-neutral-900",
                  "transition-all hover:-translate-y-0.5"
                )}
              >
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
                  <path
                    fill="currentColor"
                    d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"
                  />
                </svg>
              </Link>
            )
          )}
        </div>
      </div>
    </>
  );

  // ✅ 整卡可点：外层 Link
  if (cardClickable) {
    return (
      <Link href={href} aria-label={title} className={rootClassName}>
        {content}
      </Link>
    );
  }

  // ✅ 只有按钮可点：外层 div
  return (
    <div aria-label={title} className={rootClassName}>
      {content}
    </div>
  );
}
