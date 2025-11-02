// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNavbar, CategoryBar } from "@/components/nav";
import BagProvider from "@/components/bag/BagProvider";
import BagDrawer from "@/components/nav/BagDrawer";
import PayPalProvider from "@/components/paypal/Provider";

// ✅ 直接引入你刚才创建的客户端面包屑组件
import Breadcrumbs from "@/components/nav/Breadcrumbs";

export const metadata: Metadata = {
  title: "SocialPlatform",
  description: "社交平台 - 由 Next.js + shadcn 构建",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PayPalProvider>
            <BagProvider>
              {/* 顶部导航 */}
              <ClientNavbar />
              <div className="h-16 md:h-20 bg-white" />
              <CategoryBar />

              {/* ✅ 全局面包屑（客户端组件） */}
              <Breadcrumbs />

              {/* 主体内容 */}
              <main className="page-shell py-4 md:py-6">{children}</main>

              {/* 全局购物袋抽屉 */}
              <BagDrawer ownerId="global" />
            </BagProvider>
          </PayPalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
