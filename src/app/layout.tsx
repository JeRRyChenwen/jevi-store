// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.displayName} | Official Online Store`,
    template: `%s | ${BRAND.displayName}`,
  },

  description: BRAND.siteDescription,

  metadataBase: new URL(BRAND.siteUrl),

  openGraph: {
    type: "website",
    siteName: BRAND.displayName,
    title: `${BRAND.displayName} | Official Online Store`,
    description: BRAND.siteDescription,
    url: "/",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      {
        url: "/favicon-32-32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-white text-neutral-900 font-sans antialiased",
        )}
      >
        {children}
      </body>
    </html>
  );
}
