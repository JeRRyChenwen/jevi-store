// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNavbar, CategoryBar } from "@/components/nav";

import BagProvider from "@/components/bag/BagProvider";
import BagDrawer from "@/components/nav/BagDrawer";

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
          {/* ⬇️ 让 BagProvider 包住全站，确保任何页面都能立即响应 open() */}
          <BagProvider>
            <ClientNavbar />
            <div className="h-16 md:h-20 bg-white" />
            <CategoryBar />

            <main className="page-shell py-4 md:py-6">{children}</main>

            {/* ⬇️ 常驻挂载抽屉（fixed + translate 来隐藏/显示） */}
            <BagDrawer ownerId="global" />
          </BagProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
