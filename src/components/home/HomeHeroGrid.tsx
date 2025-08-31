import React from "react";
import { PromoTile, PromoTileProps } from "./PromoTile";

type Props = {
  /** 新增：左侧竖向大卡（跨两行，占 1 列） */
  sideLeft?: PromoTileProps;
  /** 左侧大卡（占 2 列，跨两行） */
  leftHero?: PromoTileProps;
  /** 右侧大卡（占 2 列，跨两行） */
  hero: PromoTileProps;
  /** 右侧第二行左半 */
  rightTop: PromoTileProps;
  /** 右侧第二行右半 */
  rightBottom: PromoTileProps;
};

export default function HomeHeroGrid({ sideLeft, leftHero, hero, rightTop, rightBottom }: Props) {
  // 传了 sideLeft -> 5 列；否则有 leftHero -> 4 列；都没有 -> 3 列（旧布局）
  const gridCols = sideLeft ? "md:grid-cols-5" : leftHero ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <section
      aria-label="Featured promotions"
      className={[
        "grid gap-4 md:gap-5 grid-cols-1",
        gridCols,
        "auto-rows-[220px] sm:auto-rows-[260px] md:auto-rows-[280px] lg:auto-rows-[320px]",
      ].join(" ")}
    >
      {/* 左侧竖向大卡：1 列宽，跨两行 */}
      {sideLeft && (
        <PromoTile
          {...sideLeft}
          className="md:col-span-1 md:row-span-2 h-[320px] sm:h-[420px] md:h-full"
        />
      )}

      {/* 左侧大卡（与 hero 同高度，2 列宽，跨两行） */}
      {leftHero && (
        <PromoTile
          {...leftHero}
          className="md:col-span-2 md:row-span-2 h-[320px] sm:h-[420px] md:h-full"
        />
      )}

      {/* 右侧大卡（2 列宽，跨两行） */}
      <PromoTile
        {...hero}
        className="md:col-span-2 md:row-span-2 h-[320px] sm:h-[420px] md:h-full"
      />

      {/* 第二行：两个半宽卡 */}
      <PromoTile
        {...rightTop}
        className={sideLeft || leftHero ? "md:col-span-2 h-[260px] md:h-auto" : "h-[260px] md:h-auto"}
      />
      <PromoTile
        {...rightBottom}
        className={sideLeft || leftHero ? "md:col-span-2 h-[260px] md:h-auto" : "h-[260px] md:h-auto"}
      />
    </section>
  );
}
