// src/components/home/HomeBanner.tsx
import React from "react";
import HomeBannerClient from "./HomeBannerClient";
import { fetchHomeBanners } from "@/lib/strapi";

type Props = {
  intervalMs?: number;
};

export default async function HomeBanner({ intervalMs = 8000 }: Props) {
  try {
    // ✅ 固定取 Home-Top-Banner：已在 src/lib/strapi.ts 的 fetchHomeBanners() 内部做了
    // 这里只需要拿 slides（展平后的 HomeBannerLite[]）即可
    const banners = await fetchHomeBanners(20);

    // ✅ Dev 下给你一个确定性的“是否取到图”的信号（不刷屏）
    if (process.env.NODE_ENV !== "production") {
      const first = banners?.[0];
      console.log("[HomeBanner] slides =", banners?.length ?? 0, {
        firstTitle: first?.title,
        desktop: first?.image_desktop_url,
        mobileFallback: first?.image_mobile_url, // 你现在是 desktop fallback
      });
    }

    if (!banners?.length) {
      return (
        <div className="rounded-3xl border bg-white p-6 text-sm text-neutral-600">
          HomeBanner: no slides returned from Strapi for "Home-Top-Banner". (Check
          publish/is_active/images)
        </div>
      );
    }

    return <HomeBannerClient banners={banners} intervalMs={intervalMs} />;
  } catch (e: any) {
    // ✅ 不让首页炸：把错误显示出来，方便你定位
    const msg = String(e?.message ?? "Unknown error");
    return (
      <div className="rounded-3xl border bg-white p-6 text-sm text-red-600">
        HomeBanner: failed to load banners. {msg}
      </div>
    );
  }
}
