// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNavbar, CategoryBar } from "@/components/nav";

export const metadata: Metadata = {
  title: "SocialPlatform",
  description: "社交平台 - 由 Next.js + shadcn 构建",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {/* ⚠️ 不再拼接 inter.className */}
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="sticky top-0 z-50 bg-background">
            <ClientNavbar />
            <CategoryBar />
          </header>
          <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-4 md:py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
