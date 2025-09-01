import React from "react";
import { Navbar, ClientNavbar, CategoryBar } from "@/components/nav";  
import SearchStrip from "@/components/home/SearchStrip";
import HomeHeroGrid from "@/components/home/HomeHeroGrid";

const SIDE_LEFT = {
  eyebrow: "CLEARANCE",
  title: "Extra 20% Off",
  subtitle: "End-of-season deals you can't miss",
  ctaLabel: "Shop clearance",
  href: "/clearance",
  image:
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=900&auto=format&fit=crop",
  align: "center" as const,
  darkText: false,
};

const LEFT_HERO = {
  eyebrow: "NEW SEASON",
  title: "Spring Essentials",
  subtitle: "Fresh picks for your wardrobe & home",
  ctaLabel: "Discover",
  href: "/spring",
  image:
    "https://images.unsplash.com/photo-1524592714635-d77511a4834a?q=80&w=1600&auto=format&fit=crop",
  align: "left" as const,
  darkText: false,
};

const HERO = {
  eyebrow: "ENDS SUNDAY",
  title: "SUPER WEEKEND",
  subtitle: "Huge savings on Women’s, Men’s, Home, Kids & more",
  ctaLabel: "Shop now",
  href: "/sale",
  image:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1600&auto=format&fit=crop",
  align: "left" as const,
  darkText: false,
};

const RIGHT_TOP = {
  eyebrow: "25–30% OFF",
  title: "Women's Fashion",
  subtitle: "Levi’s, Regatta, Tokito, Calvin Klein and more",
  ctaLabel: "Shop women",
  href: "/women",
  image:
    "https://images.unsplash.com/photo-1512785479248-3732b31f4953?q=80&w=1200&auto=format&fit=crop",
  align: "center" as const,
  darkText: false,
};

const RIGHT_BOTTOM = {
  eyebrow: "40% OFF",
  title: "Homewares",
  subtitle: "Bedding, dining, home décor and more",
  ctaLabel: "Shop home",
  href: "/home",
  image:
    "https://images.unsplash.com/photo-1505691723518-36a5ac3b2b8f?q=80&w=1200&auto=format&fit=crop",
  align: "left" as const,
  darkText: true,
};

export default function HomePage() {
  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 pt-2 md:pt-3 pb-6 md:pb-8 space-y-6">
      {/* 新增：类别区域（在搜索条之上） */}
      <CategoryBar />

      {/* 搜索条 */}
      <SearchStrip />

      {/* 主视觉网格 */}
      <HomeHeroGrid
        sideLeft={SIDE_LEFT}
        leftHero={LEFT_HERO}
        hero={HERO}
        rightTop={RIGHT_TOP}
        rightBottom={RIGHT_BOTTOM}
      />
    </main>
  );
}
