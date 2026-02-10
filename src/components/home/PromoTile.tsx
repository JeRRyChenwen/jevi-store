import Link from "next/link";
import React from "react";

const cx = (...cls: Array<string | false | undefined>) =>
  cls.filter(Boolean).join(" ");

export type Align = "left" | "center" | "right";

export type PromoTileProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string; // 小字，比如“25–30% OFF”
  ctaLabel?: string;
  href?: string;

  /**
   * ✅ 兼容旧版：image 仍可用（fallback）
   * 你现在从 Strapi 拿的图片建议放在 bgImageUrl（更语义化）
   */
  image?: string;

  /**
   * ✅ Strapi 驱动的背景图（优先使用它）
   * 只会渲染一层图：src = bgImageUrl ?? image
   */
  bgImageUrl?: string;

  align?: Align; // 文案对齐方式

  /**
   * ✅ 兼容旧版：darkText 仍可用
   * 但建议新代码用 textOn / overlay 来控制
   */
  darkText?: boolean;

  /**
   * ✅ NEW: 文字颜色策略
   * - auto：有背景图 => 白字；无背景图 => 黑字（简单可靠）
   * - light：强制白字
   * - dark：强制黑字
   */
  textOn?: "auto" | "light" | "dark";

  /**
   * ✅ NEW: 遮罩强度（保证可读性）
   * - none：无遮罩
   * - soft：轻遮罩
   * - strong：强遮罩（最稳）
   */
  overlay?: "none" | "soft" | "strong";

  className?: string; // 额外样式

  /**
   * ✅ NEW:
   * - true（默认）：整张卡可点击
   * - false：只有 CTA 按钮可点击
   */
  cardClickable?: boolean;
};

function overlayClass(
  mode: NonNullable<PromoTileProps["overlay"]>,
  textIsDark: boolean
) {
  if (mode === "none") return "bg-transparent";

  // 文字是深色：遮罩应该更“提亮”一点（不要盖白）
  if (textIsDark) {
    return mode === "strong" ? "bg-white/22" : "bg-white/12";
  }

  // 文字是浅色：用底部渐变增强可读性
  return mode === "strong"
    ? "bg-gradient-to-t from-black/70 via-black/30 to-transparent"
    : "bg-gradient-to-t from-black/55 via-black/20 to-transparent";
}

export function PromoTile({
  title,
  subtitle,
  eyebrow,
  ctaLabel = "Shop now",
  href = "#",
  image,
  bgImageUrl,
  align = "left",
  darkText = false,
  textOn = "auto",
  overlay = "soft",
  className,
  cardClickable = true,
}: PromoTileProps) {
  const contentAlign =
    align === "center"
      ? "items-center text-center"
      : align === "right"
      ? "items-end text-right"
      : "items-start text-left";

  const rootClassName = cx(
    "group relative overflow-hidden rounded-2xl shadow-sm",
    "ring-1 ring-black/10 dark:ring-white/10 bg-neutral-200",
    cardClickable ? "focus:outline-none focus:ring-2 focus:ring-primary" : "",
    className
  );

  // ✅ 核心：永远只使用一个图片源（避免“双层图”）
  const bg = (bgImageUrl || image || "").trim();
  const hasBg = !!bg;

  // ✅ 文字颜色决定：先兼容 darkText，再看 textOn
  // - darkText=true => 强制深色文字
  // - textOn="dark" => 深色文字
  // - textOn="light" => 白色文字
  // - auto => 有背景图默认白字；无背景图默认黑字
  const textIsDark =
    !!darkText ||
    textOn === "dark" ||
    (textOn === "auto" ? !hasBg : false);

  const eyebrowCls = textIsDark ? "text-neutral-800" : "text-white/80";
  const titleCls = textIsDark ? "text-neutral-900" : "text-white";
  const subCls = textIsDark ? "text-neutral-800" : "text-white/90";

  const ctaBase =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mt-3 shadow-sm transition-all";
  const ctaColors = textIsDark
    ? "bg-neutral-900 text-white"
    : "bg-white/95 text-neutral-900";

  const content = (
    <>
      {/* ✅ 只渲染一张图 */}
      {hasBg ? (
        <img
          src={bg}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable={false}
        />
      ) : null}

      {/* ✅ 单层遮罩：由 overlay 控制强度 */}
      <div
        className={cx("absolute inset-0", overlayClass(overlay, textIsDark))}
      />

      <div className={cx("relative z-10 flex h-full w-full p-6 sm:p-8", contentAlign)}>
        <div className="max-w-[32rem] space-y-2">
          {eyebrow && (
            <div className={cx("text-xs font-semibold uppercase tracking-wide", eyebrowCls)}>
              {eyebrow}
            </div>
          )}

          <h3 className={cx("font-bold leading-tight text-2xl sm:text-3xl lg:text-4xl", titleCls)}>
            {title}
          </h3>

          {subtitle && (
            <p className={cx("text-sm sm:text-base", subCls)}>{subtitle}</p>
          )}

          {/* ✅ CTA：cardClickable=true 时 CTA 只是外观（span）；false 时 CTA 才是 Link */}
          {ctaLabel ? (
            cardClickable ? (
              <span className={cx(ctaBase, ctaColors, "group-hover:-translate-y-0.5")}>
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
                  <path
                    fill="currentColor"
                    d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"
                  />
                </svg>
              </span>
            ) : (
              <Link
                href={href}
                aria-label={ctaLabel}
                className={cx(ctaBase, ctaColors, "hover:-translate-y-0.5")}
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
          ) : null}
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
