// src/components/home/HomeMarketingSection.tsx
"use client";

import React from "react";
import { PromoTile, PromoTileProps } from "./PromoTile";

/**
 * ✅ 新版：只保留 3 个区域
 * - Sales / Deals（促销）
 * - New Arrival（上新）
 * - Core category（核心品类主推）
 *
 * ✅ 兼容旧版传参：
 * - sales  <- leftHero（旧）
 * - newIn  <- hero（旧）
 * - core   <- rightBottom（旧）
 */
type Props = {
  /** ✅ 新：Deals / Sales 区域 */
  sales?: PromoTileProps;
  /** ✅ 新：New Arrival 区域 */
  newIn?: PromoTileProps;
  /** ✅ 新：核心品类主推区域（大入口） */
  core?: PromoTileProps;

  // ---------- 旧版兼容 ----------
  sideLeft?: PromoTileProps;
  leftHero?: PromoTileProps;
  hero?: PromoTileProps;
  rightTop?: PromoTileProps;
  rightBottom?: PromoTileProps;
};

function cardShellClass(hasBg: boolean) {
  return [
    "relative rounded-3xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow",
    hasBg ? "bg-neutral-900 bg-cover bg-center" : "bg-white",
  ].join(" ");
}

export default function HomeMarketingSection(props: Props) {
  // ✅ 兼容映射（不改 page.tsx 也能工作）
  const sales = props.sales ?? props.rightTop ?? props.leftHero ?? props.sideLeft;
  const newIn = props.newIn ?? props.leftHero ?? props.hero ?? props.rightTop;
  const core = props.core ?? props.rightBottom ?? props.sideLeft ?? props.leftHero;

  if (!sales && !newIn && !core) return null;

  /**
   * ✅ 关键：默认禁止“整卡可点击”
   * - 只保留 CTA（Shop now）可点击
   * - 但如果某处调用方显式传 cardClickable=true，我们尊重它
   */
  const asButtonOnly = (p: PromoTileProps): PromoTileProps => ({
    ...p,
    cardClickable: p.cardClickable ?? false,
  });

  /**
   * ✅ NEW：为卡片提供背景图能力
   * - 约定：PromoTileProps 支持 bgImageUrl?: string（你后面会在 PromoTile.tsx 里加）
   * - 有 bgImageUrl：用图片做底 + overlay（保证文字可读）
   * - 无 bgImageUrl：保持白底不变
   */
  const renderCard = (p: PromoTileProps, heightClassName: string) => {
    const bg = (p as any)?.bgImageUrl as string | undefined;
    const hasBg = !!bg;

    return (
      <div
        className={cardShellClass(hasBg)}
        style={hasBg ? { backgroundImage: `url(${bg})` } : undefined}
      >
        {/* ✅ overlay：有背景图时才加，避免文字看不清 */}
        {hasBg ? (
          <div className="absolute inset-0 bg-black/35" />
        ) : null}

        {/* 内容层 */}
        <div className={["relative z-10", heightClassName].join(" ")}>
          <PromoTile {...asButtonOnly(p)} />
        </div>
      </div>
    );
  };

  return (
    <section className="w-full">
      <div className="grid gap-4 md:gap-5 lg:gap-6">
        {/* 上方 2 个：并列 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
          {/* New Arrival（左） */}
          {newIn
            ? renderCard(
                newIn,
                "h-[260px] sm:h-[320px] md:h-[360px] lg:h-[420px]"
              )
            : null}

          {/* Deals / Sales（右） */}
          {sales
            ? renderCard(
                sales,
                "h-[260px] sm:h-[320px] md:h-[360px] lg:h-[420px]"
              )
            : null}
        </div>

        {/* 下方 1 个：核心品类主推（Shoes） */}
        {core ? renderCard(core, "h-[220px] sm:h-[260px] md:h-[300px]") : null}
      </div>
    </section>
  );
}
