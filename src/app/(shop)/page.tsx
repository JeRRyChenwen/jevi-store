// src/app/(shop)/page.tsx
import type { Metadata } from "next";
import {
  api,
  fetchSubcategoriesByParentId,
  resolveMediaURL,
} from "@/lib/strapi";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import HomeBanner from "@/components/home/HomeBanner";
import HomeMarketingSection from "@/components/home/HomeMarketingSection";
import HomeCategorySectionClient from "@/components/home/HomeCategorySectionClient";

const HOME_DESCRIPTION =
  "Shop add height shoes, hidden-lift shoes and elevator shoes in Australia at JEVI APPAREL STUDIO. Explore height increasing sneakers and dress shoes.";

export const metadata: Metadata = {
  title: "Add Height Shoes Australia | Hidden-Lift Shoes",
  description: HOME_DESCRIPTION,

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title:
      "Add Height Shoes Australia | Hidden-Lift Shoes | JEVI APPAREL STUDIO",
    description: HOME_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

export const revalidate = 0;

const HOME_SECTION_PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/*                          ✅ 读取 Home-Mid-Banner                           */
/* -------------------------------------------------------------------------- */

function absUrl(u?: string | null) {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;

  const base =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "http://127.0.0.1:1337";

  const b = base.replace(/\/+$/, "");
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${b}${p}`;
}

async function fetchHomeMidBannerImages(): Promise<{
  newIn?: string;
  sale?: string;
  shoes?: string;
}> {
  const qs =
    "/api/home-banners?" +
    "filters[name][$eq]=Home-Mid-Banner" +
    "&pagination[page]=1&pagination[pageSize]=1" +
    "&populate[slides][populate][0]=image_desktop";

  const json: any = await api(qs, { noCache: true });

  const row = Array.isArray(json?.data) ? json.data[0] : null;
  const slidesRaw: any[] = Array.isArray(row?.slides) ? row.slides : [];

  // ✅ 按 order 排序（没填 order 的放后面）
  const slides = [...slidesRaw].sort((a, b) => {
    const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : 9999;
    const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : 9999;
    return ao - bo;
  });

  // ✅ 取图：优先用你 lib/strapi.ts 的 resolveMediaURL（兼容 formats）
  const getImg = (s: any) => {
    const rel = resolveMediaURL(s?.image_desktop, "large") || "";
    return absUrl(rel);
  };

  return {
    newIn: getImg(slides[0]),
    sale: getImg(slides[1]),
    shoes: getImg(slides[2]),
  };
}

/* -------------------------------------------------------------------------- */
/*                         顶级分类读取（不变）                                */
/* -------------------------------------------------------------------------- */

async function fetchNavTopCategories(): Promise<
  Array<{ slug: string; title: string; documentId: string }>
> {
  const qs =
    "/api/categories?" +
    "filters[show_in_nav][$eq]=true" +
    "&filters[parent][id][$null]=true" +
    "&sort[0]=nav_order:asc" +
    "&pagination[page]=1&pagination[pageSize]=50" +
    "&fields[0]=name&fields[1]=slug&fields[2]=nav_order&fields[3]=show_in_nav";

  const json: any = await api(qs, { noCache: true });
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];

  return rows
    .map((r) => {
      const a = r?.attributes ?? r ?? {};
      return {
        slug: String(a?.slug ?? "").trim(),
        title: String(a?.name ?? "").trim(),
        documentId: String(a?.documentId ?? "").trim(),
      };
    })
    .filter((x) => x.slug && x.documentId);
}

const HOME_PROMO_SLUGS = new Set(["new-in", "on-sale"]);

function buildHomePromoProductFilters(
  slug: string,
  nowISO: string,
  currencyCode: string,
): string[] {
  const parts: string[] = [];

  if (slug === "on-sale") {
    const currency = String(currencyCode || "AUD")
      .trim()
      .toUpperCase();

    parts.push(
      `filters[$and][0][prices][currency][$eq]=${encodeURIComponent(currency)}`,
    );

    parts.push(`filters[$and][1][prices][discount][$lt]=100`);

    parts.push(`filters[$and][2][$or][0][prices][sale_starts_at][$null]=true`);

    parts.push(
      `filters[$and][2][$or][1][prices][sale_starts_at][$lte]=${encodeURIComponent(
        nowISO,
      )}`,
    );

    parts.push(`filters[$and][3][$or][0][prices][sale_ends_at][$null]=true`);

    parts.push(
      `filters[$and][3][$or][1][prices][sale_ends_at][$gte]=${encodeURIComponent(
        nowISO,
      )}`,
    );

    return parts;
  }

  if (slug === "new-in") {
    parts.push(`filters[new_starts_at][$notNull]=true`);
    parts.push(`filters[new_starts_at][$lte]=${encodeURIComponent(nowISO)}`);
    parts.push(`filters[$or][0][new_ends_at][$null]=true`);
    parts.push(
      `filters[$or][1][new_ends_at][$gte]=${encodeURIComponent(nowISO)}`,
    );
  }

  return parts;
}

async function fetchHomeSectionProducts({
  slug,
  categoryDocIds,
  pageSize,
  displayCurrency,
}: {
  slug: string;
  categoryDocIds: string[];
  pageSize: number;
  displayCurrency: string;
}): Promise<{
  rows: any[];
  total: number;
}> {
  const parts: string[] = [];
  const isPromo = HOME_PROMO_SLUGS.has(slug);

  if (!isPromo) {
    if (categoryDocIds.length > 0) {
      categoryDocIds.forEach((documentId, index) => {
        const encodedDocumentId = encodeURIComponent(documentId);

        parts.push(
          `filters[$and][0][$or][0][category][documentId][$in][${index}]=${encodedDocumentId}`,
        );

        parts.push(
          `filters[$and][0][$or][1][category][parent][documentId][$in][${index}]=${encodedDocumentId}`,
        );
      });
    } else {
      const encodedSlug = encodeURIComponent(slug);

      parts.push(
        `filters[$and][0][$or][0][category][slug][$eq]=${encodedSlug}`,
      );

      parts.push(
        `filters[$and][0][$or][1][category][parent][slug][$eq]=${encodedSlug}`,
      );
    }
  } else {
    parts.push(
      ...buildHomePromoProductFilters(
        slug,
        new Date().toISOString(),
        displayCurrency,
      ),
    );
  }

  parts.push(`filters[is_showed][$eq]=true`);

  const qs =
    `/api/products?${parts.join("&")}` +
    `&fields[0]=title&fields[1]=slug` +
    `&fields[2]=hot_score&fields[3]=priority` +
    `&fields[4]=new_starts_at&fields[5]=new_ends_at` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][card_image]=true` +
    `&populate[color_galleries][populate][images]=true` +
    `&populate[variants][fields][0]=color` +
    `&populate[variants][fields][1]=size` +
    `&populate[prices]=*` +
    `&pagination[page]=1&pagination[pageSize]=${pageSize}` +
    `&sort[0]=hot_score:desc` +
    `&sort[1]=priority:asc` +
    `&sort[2]=updatedAt:desc` +
    `&publicationState=live`;

  const json: any = await api(qs, { noCache: true });

  return {
    rows: Array.isArray(json?.data) ? json.data : [],
    total: Number(json?.meta?.pagination?.total ?? 0),
  };
}

/* -------------------------------------------------------------------------- */
/*                                Home Page                                   */
/* -------------------------------------------------------------------------- */

export default async function HomePage() {
  const navTopCats = await fetchNavTopCategories();

  const sections = await Promise.all(
    navTopCats.map(async (cat) => {
      const children = await fetchSubcategoriesByParentId(cat.documentId);
      const childIds = children.map((c: any) => c?.documentId).filter(Boolean);

      const categoryDocIds = [cat.documentId, ...childIds] as string[];

      const initialProductsResult = await fetchHomeSectionProducts({
        slug: cat.slug,
        categoryDocIds,
        pageSize: HOME_SECTION_PAGE_SIZE,
        displayCurrency: CURRENT_STOREFRONT.defaultCurrency,
      });

      return {
        slug: cat.slug,
        title: cat.title,
        categoryDocIds,
        initialRows: initialProductsResult.rows,
        initialTotal: initialProductsResult.total,
      };
    }),
  );

  // ✅ 读取 Mid Banner 图片
  const midImages = await fetchHomeMidBannerImages();

  return (
    <main className="w-full max-w-none pb-10">
      <section className="px-4 md:px-6 lg:px-8 pt-2 md:pt-3 space-y-6">
        <section className="mx-auto max-w-4xl px-4 pb-3 pt-1 text-center">
          <h1 className="font-serif text-xl font-normal tracking-[0.035em] text-neutral-900 md:text-2xl">
            Hidden-Lift, Elevator &amp; Height Increasing Shoes in Australia
          </h1>

          <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 tracking-[0.015em] text-neutral-600 md:text-sm">
            Searching for add height shoes in Australia? Discover hidden-lift
            shoes, elevator shoes and height increasing sneakers from JEVI
            APPAREL STUDIO, designed to add height discreetly while maintaining
            everyday comfort, natural proportions and versatile style.
          </p>
        </section>

        <HomeBanner intervalMs={7000} />

        <div className="h-px bg-neutral-200" />

        <HomeMarketingSection
          newIn={{
            title: "New Arrival",
            subtitle:
              "Fresh drops, curated weekly — discover new styles and limited restocks.",
            eyebrow: "NEW IN",
            ctaLabel: "Shop now",
            href: "/category/new-in",

            // ✅ 只传 bgImageUrl（不要再传 image，避免叠图）
            bgImageUrl: midImages.newIn,

            textOn: "auto",
            overlay: "strong",
            align: "left",
            cardClickable: false,
          }}
          sales={{
            title: "Sale Picks",
            subtitle: "Selected styles at special prices — while stocks last.",
            eyebrow: "ON SALE",
            ctaLabel: "Shop now",
            href: "/category/on-sale",

            // ✅ 只传 bgImageUrl
            bgImageUrl: midImages.sale,

            textOn: "auto",
            overlay: "strong",
            align: "left",
            cardClickable: false,
          }}
          core={{
            title: "Shoes",
            subtitle:
              "Small-foot friendly sizing + height-boost options. Find your perfect fit — no compromises.",
            eyebrow: "CORE CATEGORY",
            ctaLabel: "Shop now",
            href: "/category/shoes",

            // ✅ 只传 bgImageUrl
            bgImageUrl: midImages.shoes,

            textOn: "auto",
            overlay: "strong",
            align: "left",
            cardClickable: false,
          }}
        />

        <div className="h-px bg-neutral-200" />
      </section>

      <div className="px-4 md:px-6 lg:px-8 space-y-12 pt-8">
        {sections.map((s) => (
          <HomeCategorySectionClient
            key={s.slug}
            slug={s.slug}
            title={s.title}
            categoryDocIds={s.categoryDocIds}
            initialRows={s.initialRows}
            initialTotal={s.initialTotal}
            pageSize={HOME_SECTION_PAGE_SIZE}
            displayCurrency={CURRENT_STOREFRONT.defaultCurrency}
          />
        ))}
      </div>
    </main>
  );
}
