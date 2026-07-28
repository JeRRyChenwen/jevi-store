// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const shouldLoadGoogleAnalytics =
  process.env.NODE_ENV === "production" &&
  Boolean(GA_MEASUREMENT_ID) &&
  /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID ?? "");

export const metadata: Metadata = {
  title: {
    default: "JEVI APPAREL STUDIO | Official Online Store",
    template: "%s | JEVI APPAREL STUDIO",
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
        url: "/favicon-96.png",
        sizes: "96x96",
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

      {shouldLoadGoogleAnalytics ? (
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID!} />
      ) : null}
    </html>
  );
}
