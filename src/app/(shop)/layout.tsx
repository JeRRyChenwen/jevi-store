// src/app/(shop)/layout.tsx
import type { ReactNode } from "react";

import { ClientNavbar, CategoryBar } from "@/components/nav";
import BagProvider from "@/components/bag/BagProvider";
import BagDrawer from "@/components/nav/BagDrawer";
import PayPalProvider from "@/components/paypal/Provider";
import Breadcrumbs from "@/components/nav/Breadcrumbs";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <PayPalProvider>
      <BagProvider>
        <ClientNavbar />
        {/* 顶部导航占位高度 */}
        <div className="h-16 md:h-20 bg-white" />

        <CategoryBar />

        {/* 面包屑 */}
        <div className="page-shell">
          <Breadcrumbs className="mt-6 md:mt-8 ml-6 md:ml-10" />
        </div>

        {/* 主内容区域 */}
        <main className="page-shell py-4 md:py-6">{children}</main>

        <SiteFooter />

        <BagDrawer ownerId="global" />
      </BagProvider>
    </PayPalProvider>
  );
}
