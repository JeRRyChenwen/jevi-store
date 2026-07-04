// src/app/robots.ts
import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

const SITE_URL = BRAND.siteUrl.replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/checkout",
          "/checkout/",
          "/profile",
          "/profile/",
          "/cart",
          "/bag",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}