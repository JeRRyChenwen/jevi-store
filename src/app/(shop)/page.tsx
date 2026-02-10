// src/app/(shop)/page.tsx
import { api, fetchSubcategoriesByParentId } from "@/lib/strapi";

import HomeBanner from "@/components/home/HomeBanner";
import HomeMarketingSection from "@/components/home/HomeMarketingSection";
import HomeCategorySectionClient from "@/components/home/HomeCategorySectionClient";

export const revalidate = 0;

const HOME_SECTION_PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/*                          ✅ 读取 Home-Mid-Banner                           */
/* -------------------------------------------------------------------------- */

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
  const slides: any[] = Array.isArray(row?.slides) ? row.slides : [];

  const base =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "http://127.0.0.1:1337";

  const toAbs = (u?: string) =>
    u?.startsWith("http") ? u : `${base}${u ?? ""}`;

  const getImg = (s: any) => {
    const url = s?.image_desktop?.url;
    return url ? toAbs(url) : undefined;
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
        slug: String(a?.slug ?? ""),
        title: String(a?.name ?? ""),
        documentId: String(a?.documentId ?? ""),
      };
    })
    .filter((x) => x.slug && x.documentId);
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

      return {
        slug: cat.slug,
        title: cat.title,
        categoryDocIds: [cat.documentId, ...childIds] as string[],
      };
    })
  );

  // ✅ 读取 Mid Banner 图片
  const midImages = await fetchHomeMidBannerImages();

  return (
    <main className="w-full max-w-none pb-10">
      <section className="px-4 md:px-6 lg:px-8 pt-2 md:pt-3 space-y-6">
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
            pageSize={HOME_SECTION_PAGE_SIZE}
            displayCurrency="AUD"
          />
        ))}
      </div>
    </main>
  );
}
