// src/components/home/PromoTile.tsx
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
   * ✅ 背景图（旧字段，保留兼容）
   * - 以前你是必须传 image
   * - 现在改成可选，因为很多时候背景图由外层卡片壳控制
   */
  image?: string;

  /**
   * ✅ NEW：背景图（推荐用这个名字，更语义化）
   * - 如果传了 bgImageUrl，则优先使用它
   */
  bgImageUrl?: string;

  align?: Align; // 文案对齐方式

  /**
   * ✅ 字色策略：
   * - "auto"(默认)：有背景图时用浅色字，否则用深色字（可读性更好）
   * - "light"：强制白字
   * - "dark"：强制黑字
   */
  textOn?: "light" | "dark" | "auto";

  /**
   * ✅ overlay 强度（仅当 PromoTile 自己在渲染背景图时生效）
   * - 如果背景图由外层 renderCard 负责，建议 overlay="none"
   */
  overlay?: "none" | "soft" | "strong" | "solid";

  className?: string; // 额外样式

  /**
   * ✅ NEW:
   * - true（默认）：整张卡可点击（当前行为）
   * - false：只有 CTA 按钮可点击
   */
  cardClickable?: boolean;
};

function overlayClass(kind: PromoTileProps["overlay"], darkText: boolean) {
  // darkText=true（深色字）时一般不需要暗 overlay；可以用浅色实底提升对比
  if (darkText) {
    if (kind === "solid") return "bg-white/85";
    if (kind === "strong") return "bg-white/70";
    if (kind === "soft") return "bg-white/45";
    return "bg-transparent";
  }

  // 浅色字（白字）：用暗 overlay 或渐变更常见
  if (kind === "solid") return "bg-black/55";
  if (kind === "strong")
    return "bg-gradient-to-t from-black/70 via-black/30 to-transparent";
  if (kind === "soft")
    return "bg-gradient-to-t from-black/55 via-black/20 to-transparent";
  return "bg-transparent";
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

  const bg = (bgImageUrl ?? image ?? "").trim();
  const hasBg = !!bg;

  // ✅ auto：有背景图 -> 白字；无背景图 -> 黑字
  const darkText =
    textOn === "auto" ? !hasBg : textOn === "dark" ? true : false;

  const rootClassName = cx(
    "group relative overflow-hidden rounded-2xl shadow-sm",
    "ring-1 ring-black/10 dark:ring-white/10",
    // ✅ 没有背景图时给个柔和底色，避免透明导致难看
    hasBg ? "bg-neutral-900" : "bg-white",
    // ✅ 只有整卡可点时才需要 focus ring（否则会出现莫名其妙的 focus 样式）
    cardClickable ? "focus:outline-none focus:ring-2 focus:ring-primary" : "",
    className
  );

  const content = (
    <>
      {/* ✅ 背景图：只有当 bgImageUrl/image 传进来时才渲染
          如果你外层 already 把背景图做了，这里就不要传 bgImageUrl/image（避免重复） */}
      {hasBg ? (
        <img
          src={bg}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      ) : null}

      {/* ✅ overlay：仅当 PromoTile 自己渲染背景图时才需要 */}
      {hasBg ? (
        <div className={cx("absolute inset-0", overlayClass(overlay, darkText))} />
      ) : null}

      <div
        className={cx("relative z-10 flex h-full w-full p-6 sm:p-8", contentAlign)}
      >
        <div className="max-w-[32rem] space-y-2">
          {eyebrow ? (
            <div
              className={cx(
                "text-xs font-semibold uppercase tracking-wide",
                darkText ? "text-neutral-700" : "text-white/80"
              )}
            >
              {eyebrow}
            </div>
          ) : null}

          <h3
            className={cx(
              "font-bold leading-tight text-2xl sm:text-3xl lg:text-4xl",
              darkText ? "text-neutral-900" : "text-white"
            )}
          >
            {title}
          </h3>

          {subtitle ? (
            <p
              className={cx(
                "text-sm sm:text-base",
                darkText ? "text-neutral-700" : "text-white/90"
              )}
            >
              {subtitle}
            </p>
          ) : null}

          {/* ✅ CTA：cardClickable=true 时 CTA 只是外观（span）；false 时 CTA 才是 Link */}
          {ctaLabel ? (
            cardClickable ? (
              <span
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mt-3 shadow-sm",
                  darkText
                    ? "bg-neutral-900 text-white"
                    : "bg-white/95 text-neutral-900",
                  "transition-all group-hover:-translate-y-0.5"
                )}
              >
                {ctaLabel}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="opacity-80"
                >
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
                  darkText
                    ? "bg-neutral-900 text-white"
                    : "bg-white/95 text-neutral-900",
                  "transition-all hover:-translate-y-0.5"
                )}
              >
                {ctaLabel}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="opacity-80"
                >
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
