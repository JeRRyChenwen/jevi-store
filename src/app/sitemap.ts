// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { api } from "@/lib/strapi";

const SITE_URL = BRAND.siteUrl.replace(/\/+$/, "");

const FALLBACK_CATEGORY_SLUGS = [
  "shoes",
  "bottoms",
  "tops",
  "suit",
  "accessories",
  "outfit",
  "new-in",
  "on-sale",
];

type StrapiCategoryRow = {
  slug: string;
  updatedAt?: string;
};

function absoluteUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

function getRowValue(row: any, key: string) {
  return row?.attributes?.[key] ?? row?.[key] ?? null;
}

async function fetchCategorySitemapRows(): Promise<StrapiCategoryRow[]> {
  const rows: StrapiCategoryRow[] = [];
  let page = 1;
  const pageSize = 200;

  try {
    while (true) {
      const json: any = await api(
        `/api/categories` +
          `?fields[0]=slug` +
          `&fields[1]=updatedAt` +
          `&pagination[page]=${page}` +
          `&pagination[pageSize]=${pageSize}` +
          `&publicationState=live`,
        { noCache: true }
      );

      const data: any[] = json?.data ?? [];

      for (const item of data) {
        const slug = String(getRowValue(item, "slug") || "").trim();
        const updatedAt = String(getRowValue(item, "updatedAt") || "").trim();

        if (slug) {
          rows.push({
            slug,
            updatedAt: updatedAt || undefined,
          });
        }
      }

      const total = Number(json?.meta?.pagination?.total ?? data.length);
      if (page * pageSize >= total) break;

      page += 1;
    }
  } catch {
    return FALLBACK_CATEGORY_SLUGS.map((slug) => ({ slug }));
  }

  const seen = new Set<string>();

  return rows.filter((row) => {
    if (!row.slug || seen.has(row.slug)) return false;
    seen.add(row.slug);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const categories = await fetchCategorySitemapRows();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/category/${category.slug}`),
    lastModified: category.updatedAt ? new Date(category.updatedAt) : now,
    changeFrequency: "daily",
    priority:
      category.slug === "new-in" || category.slug === "on-sale" ? 0.9 : 0.8,
  }));

  return [...staticPages, ...categoryPages];
}