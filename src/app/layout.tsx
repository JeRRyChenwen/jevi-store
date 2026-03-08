// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.displayName} | Official Store`,
    template: `%s | ${BRAND.displayName}`,
  },
  description: BRAND.siteDescription,
  metadataBase: new URL(BRAND.siteUrl),

  icons: {
    icon: [
      { url: "/favicon-32-32.png", sizes: "32x32", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-white text-neutral-900 font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}