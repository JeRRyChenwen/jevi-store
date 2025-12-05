// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

import { ClientNavbar, CategoryBar } from "@/components/nav";
import BagProvider from "@/components/bag/BagProvider";
import BagDrawer from "@/components/nav/BagDrawer";
import PayPalProvider from "@/components/paypal/Provider";
import Breadcrumbs from "@/components/nav/Breadcrumbs";
import { SiteFooter } from "@/components/layout/SiteFooter"; // ✅ 用命名导入

export const metadata: Metadata = {
  title: "SocialPlatform",
  description: "社交平台 - 由 Next.js + shadcn 构建",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {/* 不再用 ThemeProvider，固定浅色主题 */}
      <body
        className={cn(
          "min-h-screen bg-white text-neutral-900 font-sans antialiased"
        )}
      >
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

            {/* 站点底部 */}
            <SiteFooter />

            {/* 购物袋抽屉 */}
            <BagDrawer ownerId="global" />
          </BagProvider>
        </PayPalProvider>
      </body>
    </html>
  );
}
