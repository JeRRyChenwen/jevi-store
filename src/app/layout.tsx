// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNavbar, CategoryBar } from "@/components/nav";

import BagProvider from "@/components/bag/BagProvider";
import BagDrawer from "@/components/nav/BagDrawer";

// ✅ 新增：只引入我们自己封装的 Client Provider
import PayPalProvider from "@/components/paypal/Provider";

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
          {/* ✅ 这里用 Client 组件包起来，避免在 Server 端直接导入 @paypal/react-paypal-js */}
          <PayPalProvider>
            {/* 你的全站状态/导航等依旧保持 */}
            <BagProvider>
              <ClientNavbar />
              <div className="h-16 md:h-20 bg-white" />
              <CategoryBar />

              <main className="page-shell py-4 md:py-6">{children}</main>

              <BagDrawer ownerId="global" />
            </BagProvider>
          </PayPalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
