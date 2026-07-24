// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { api } from "@/lib/strapi";

const SITE_URL = BRAND.siteUrl.replace(/\/+$/, "");



export const dynamic = "force-dynamic";
/**
 * 当前允许 Google 收录的分类。
 *
 * 目前店铺只销售鞋子，因此不再把 Tops、Bottoms、Suit、
 * Accessories、Outfit 等旧分类提交到 sitemap。
 */
const INDEXABLE_CATEGORY_SLUGS = new Set([
  "shoes",
  "casual-shoes",
  "formal-shoes",
  "new-in",
  "on-sale",
]);

const FALLBACK_CATEGORY_SLUGS = [
  "shoes",
  "casual-shoes",
  "formal-shoes",
  "new-in",
  "on-sale",
];

type SitemapRow = {
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

function parseLastModified(value?: string, fallback?: Date) {
  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

async function fetchCategorySitemapRows(): Promise<SitemapRow[]> {
  const rows: SitemapRow[] = [];
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
        { noCache: true },
      );

      const data: any[] = Array.isArray(json?.data) ? json.data : [];

      for (const item of data) {
        const slug = String(getRowValue(item, "slug") || "").trim();
        const updatedAt = String(
          getRowValue(item, "updatedAt") || "",
        ).trim();

        if (slug && INDEXABLE_CATEGORY_SLUGS.has(slug)) {
          rows.push({
            slug,
            updatedAt: updatedAt || undefined,
          });
        }
      }

      const total = Number(json?.meta?.pagination?.total ?? data.length);

      if (page * pageSize >= total) {
        break;
      }

      page += 1;
    }
  } catch {
    return FALLBACK_CATEGORY_SLUGS.map((slug) => ({ slug }));
  }

  const seen = new Set<string>();

  return rows.filter((row) => {
    if (!row.slug || seen.has(row.slug)) {
      return false;
    }

    seen.add(row.slug);
    return true;
  });
}

async function fetchProductSitemapRows(): Promise<SitemapRow[]> {
  const rows: SitemapRow[] = [];
  let page = 1;
  const pageSize = 200;

  try {
    while (true) {
      const json: any = await api(
        `/api/products` +
          `?filters[is_showed][$eq]=true` +
          `&fields[0]=slug` +
          `&fields[1]=updatedAt` +
          `&pagination[page]=${page}` +
          `&pagination[pageSize]=${pageSize}` +
          `&publicationState=live`,
        { noCache: true },
      );

      const data: any[] = Array.isArray(json?.data) ? json.data : [];

      for (const item of data) {
        const slug = String(getRowValue(item, "slug") || "").trim();
        const updatedAt = String(
          getRowValue(item, "updatedAt") || "",
        ).trim();

        if (slug) {
          rows.push({
            slug,
            updatedAt: updatedAt || undefined,
          });
        }
      }

      const total = Number(json?.meta?.pagination?.total ?? data.length);

      if (page * pageSize >= total) {
        break;
      }

      page += 1;
    }
  } catch (error) {
    console.error("[sitemap] Failed to load products:", error);
    return [];
  }

  const seen = new Set<string>();

  return rows.filter((row) => {
    if (!row.slug || seen.has(row.slug)) {
      return false;
    }

    seen.add(row.slug);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();

  const [categories, products] = await Promise.all([
    fetchCategorySitemapRows(),
    fetchProductSitemapRows(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: generatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/category/${category.slug}`),
    lastModified: parseLastModified(category.updatedAt, generatedAt),
    changeFrequency: "daily",
    priority:
      category.slug === "new-in" || category.slug === "on-sale" ? 0.9 : 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/product/${product.slug}`),
    lastModified: parseLastModified(product.updatedAt, generatedAt),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}