// src/components/home/HomeMarketingSection.tsx
import React from "react";
import { PromoTile, PromoTileProps } from "./PromoTile";

type Props = {
  /** 新增：左侧竖向大卡（跨两行，占 1 列） */
  sideLeft?: PromoTileProps;
  /** 左侧大卡（占 2 列，跨两行） */
  leftHero?: PromoTileProps;
  /** 右侧大卡（占 2 列，跨两行） */
  hero?: PromoTileProps;
  /** 右侧第二行左半 */
  rightTop?: PromoTileProps;
  /** 右侧第二行右半 */
  rightBottom?: PromoTileProps;

  /** 是否展示“信任/承诺条”（免运/退换/安全支付等） */
  showTrustStrip?: boolean;

  /** 自定义信任条内容（不传则用默认） */
  trustItems?: Array<{ title: string; desc: string }>;
};

/**
 * ✅ 主页第一个区域：销售型信息架构（可卖货）
 *
 * 你可以把它理解成 3 层：
 * 1) 主推（Hero）—— 现在最想卖什么 / 最大活动
 * 2) 辅助入口（2 个小卡）—— Sale / New / Outfit / Accessories 之类
 * 3) 信任与承诺（Trust Strip）—— 提升转化（免运、退换、安全支付）
 *
 * ✅ 设计原则：
 * - 首屏必须有一个“主推主题”（Hero）
 * - 其余卡片只做一件事：要么导购、要么促销、要么上新
 * - 增加轻量信任条：对新站非常重要
 */
export default function HomeMarketingSection({
  sideLeft,
  leftHero,
  hero,
  rightTop,
  rightBottom,
  showTrustStrip = true,
  trustItems,
}: Props) {
  // 传了 sideLeft -> 5 列；否则有 leftHero -> 4 列；都没有 -> 3 列（旧布局）
  const gridCols = sideLeft
    ? "md:grid-cols-5"
    : leftHero
    ? "md:grid-cols-4"
    : "md:grid-cols-3";

  /**
   * ✅ 默认占位内容（让你不传 props 也能直接看到“电商式首页销售区”）
   * 你后续完全可以把这些内容迁移到 Strapi 做成可配置。
   */
  const HERO_DATA_URI =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f4f6"/>
      <stop offset="1" stop-color="#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
</svg>`);

  // ✅ 1) 左侧竖卡：常用于“限时促销 / 会员专属 / 新客福利”
  const defaultSideLeft: PromoTileProps = {
    eyebrow: "LIMITED TIME",
    title: "Sale Highlights",
    subtitle: "Up to 30% off selected styles. Grab the best deals first.",
    ctaLabel: "Shop sale",
    href: "/sale",
    image: HERO_DATA_URI,
    darkText: true,
    align: "left",
  };

  // ✅ 2) 左侧大卡：常用于“核心品类主推”
  const defaultLeftHero: PromoTileProps = {
    eyebrow: "FEATURED",
    title: "New Season Shoes",
    subtitle: "Smart essentials curated by hot score—built for everyday wear.",
    ctaLabel: "Shop shoes",
    href: "/category/shoes",
    image: HERO_DATA_URI,
    darkText: true,
    align: "left",
  };

  // ✅ 3) 右侧大卡（主 Hero）：常用于“站点定位 + 主卖点 + 强 CTA”
  const defaultHero: PromoTileProps = {
    eyebrow: "EDITOR'S PICK",
    title: "Top Picks for Your Week",
    subtitle: "Curated outfits for work, weekend & travel—simple, premium, wearable.",
    ctaLabel: "Explore picks",
    href: "/category/outfit",
    image: HERO_DATA_URI,
    darkText: false,
    align: "left",
  };

  // ✅ 4) 右下两个半卡：导购入口（上新/配饰/套装/热卖）
  const defaultRightTop: PromoTileProps = {
    eyebrow: "NEW ARRIVALS",
    title: "Fresh Tops",
    subtitle: "New drops added regularly—start with best sellers.",
    ctaLabel: "Shop tops",
    href: "/category/tops",
    image: HERO_DATA_URI,
    darkText: false,
    align: "left",
  };

  const defaultRightBottom: PromoTileProps = {
    eyebrow: "COMPLETE THE LOOK",
    title: "Accessories",
    subtitle: "Finish your outfit with minimal, versatile pieces.",
    ctaLabel: "Shop accessories",
    href: "/category/accessories",
    image: HERO_DATA_URI,
    darkText: false,
    align: "left",
  };

  const finalSideLeft = sideLeft ?? defaultSideLeft;
  const finalLeftHero = leftHero ?? defaultLeftHero;
  const finalHero = hero ?? defaultHero;
  const finalRightTop = rightTop ?? defaultRightTop;
  const finalRightBottom = rightBottom ?? defaultRightBottom;

  // ✅ 信任条：给“新站/新用户”一个心理安全垫
  const finalTrustItems =
    trustItems ??
    [
      { title: "Free shipping", desc: "Free shipping over $100" },
      { title: "Easy returns", desc: "30-day hassle-free returns" },
      { title: "Secure checkout", desc: "Encrypted & trusted payments" },
    ];

  return (
    <section aria-label="Featured promotions" className="space-y-4 md:space-y-5">
      {/* ✅ 主销售区：多卡布局（你原来的布局升级版） */}
      <div
        className={[
          "grid gap-4 md:gap-5 grid-cols-1",
          gridCols,
          "auto-rows-[220px] sm:auto-rows-[260px] md:auto-rows-[280px] lg:auto-rows-[320px]",
        ].join(" ")}
      >
        {/* 左侧竖向大卡：1 列宽，跨两行 */}
        {finalSideLeft && (
          <PromoTile
            {...finalSideLeft}
            className="md:col-span-1 md:row-span-2 h-[320px] sm:h-[420px] md:h-full"
          />
        )}

        {/* 左侧大卡（与 hero 同高度，2 列宽，跨两行） */}
        {finalLeftHero && (
          <PromoTile
            {...finalLeftHero}
            className="md:col-span-2 md:row-span-2 h-[320px] sm:h-[420px] md:h-full"
          />
        )}

        {/* 右侧大卡（2 列宽，跨两行） */}
        <PromoTile
          {...finalHero}
          className="md:col-span-2 md:row-span-2 h-[320px] sm:h-[420px] md:h-full"
        />

        {/* 第二行：两个半宽卡 */}
        <PromoTile
          {...finalRightTop}
          className={
            finalSideLeft || finalLeftHero
              ? "md:col-span-2 h-[260px] md:h-auto"
              : "h-[260px] md:h-auto"
          }
        />
        <PromoTile
          {...finalRightBottom}
          className={
            finalSideLeft || finalLeftHero
              ? "md:col-span-2 h-[260px] md:h-auto"
              : "h-[260px] md:h-auto"
          }
        />
      </div>

      {/* ✅ 信任/承诺条：强烈建议保留（提升转化，尤其你现在是新站） */}
      {showTrustStrip ? (
        <div className="rounded-2xl border bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3">
            {finalTrustItems.slice(0, 3).map((it, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="text-sm font-semibold">{it.title}</div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
