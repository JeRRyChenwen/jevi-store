// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNavbar, CategoryBar } from "@/components/nav";
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
          // 使用全局 CSS 变量（见 globals.css），并保持抗锯齿
          "min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* 头部占满背景；内容限制在 page-shell 容器内 */}
          <header className="sticky top-0 z-50 bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
            <div className="page-shell">
              <ClientNavbar />
            </div>
            <div className="page-shell">
              <CategoryBar />
            </div>
          </header>

          {/* 主体统一用 page-shell 控制最大宽度与左右留白 */}
          <main className="page-shell py-4 md:py-6">
            {children}
          </main>

          {/* 全局仅挂载一次购物袋抽屉（Portal 渲染） */}
          <BagDrawer />
        </ThemeProvider>
      </body>
    </html>
  );
}
