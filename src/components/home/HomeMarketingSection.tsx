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

  return (
    <section className="w-full">
      <div className="grid gap-4 md:gap-5 lg:gap-6">
        {/* 上方 2 个：并列 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
          {/* New Arrival（左） */}
          {newIn ? (
            <div className="rounded-3xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="h-[260px] sm:h-[320px] md:h-[360px] lg:h-[420px]">
                <PromoTile {...asButtonOnly(newIn)} />
              </div>
            </div>
          ) : null}

          {/* Deals / Sales（右） */}
          {sales ? (
            <div className="rounded-3xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="h-[260px] sm:h-[320px] md:h-[360px] lg:h-[420px]">
                <PromoTile {...asButtonOnly(sales)} />
              </div>
            </div>
          ) : null}
        </div>

        {/* 下方 1 个：核心品类主推（Shoes） */}
        {core ? (
          <div className="rounded-3xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="h-[220px] sm:h-[260px] md:h-[300px]">
              <PromoTile {...asButtonOnly(core)} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
