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
      <body className={cn("min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PayPalProvider>
            <BagProvider>
              <ClientNavbar />
              <div className="h-16 md:h-20 bg-white" />
              <CategoryBar />

              {/* ✅ 把面包屑放进与你页面同宽的容器里，然后通过 className 定位 */}
              <div className="page-shell">
                <Breadcrumbs className="mt-6 md:mt-8 ml-6 md:ml-10" />
                {/* 也可以用 px 控制整体内边距：px-6 md:px-10 */}
              </div>

              <main className="page-shell py-4 md:py-6">{children}</main>

              <BagDrawer ownerId="global" />
            </BagProvider>
          </PayPalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}