// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNavbar, CategoryBar } from "@/components/nav";
import SearchStrip from "@/components/home/SearchStrip"; // ← 搜索条也全局显示

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SocialPlatform",
  description: "社交平台 - 由 Next.js + shadcn 构建",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* 全站头部：吸顶 */}
          <header className="sticky top-0 z-50 bg-background">
            <ClientNavbar />
            <CategoryBar />
            {/* 分类栏下方放全站搜索条（留一点内边距） */}
            {/* <div className="px-4 md:px-6 lg:px-8 py-3">
              <SearchStrip />
            </div> */}
          </header>

          {/* 页面主体 */}
          <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-4 md:py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
