// src/app/(shop)/layout.tsx
import type { ReactNode } from "react";

import { ClientNavbar, CategoryBar } from "@/components/nav";
import BagProvider from "@/components/bag/BagProvider";
import BagDrawer from "@/components/nav/BagDrawer";
import Breadcrumbs from "@/components/nav/Breadcrumbs";
import { SiteFooter } from "@/components/layout/SiteFooter";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <BagProvider>
      {/* ✅ 关键：用 flex-col + min-h-screen 做 sticky footer */}
      <div className="min-h-screen flex flex-col">
        <ClientNavbar />
        {/* 顶部导航占位高度 */}
        <div className="h-16 md:h-20 bg-white" />

        <CategoryBar />

        {/* 面包屑 */}
        <div className="page-shell">
          <Breadcrumbs className="mt-6 md:mt-8 ml-6 md:ml-10" />
        </div>

        {/* ✅ 关键：主内容区域要 flex-1，把 footer 推到底 */}
        <main className="page-shell py-4 md:py-6 flex-1">{children}</main>

        <SiteFooter />

        <BagDrawer ownerId="global" />
        <CookieConsentBanner />
      </div>
    </BagProvider>
  );
}