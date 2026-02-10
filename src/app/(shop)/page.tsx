// src/app/(shop)/page.tsx
import { api, fetchSubcategoriesByParentId } from "@/lib/strapi";

// ✅ 新增：首页顶部 Banner（Strapi 驱动轮播）
import HomeBanner from "@/components/home/HomeBanner";

// ✅ 顶部营销区：复用你抽出来的组件
import HomeMarketingSection from "@/components/home/HomeMarketingSection";

// ✅ 复用 category page 的卡片能力（Client）
import HomeCategorySectionClient from "@/components/home/HomeCategorySectionClient";

export const revalidate = 0;

// ✅ 每个分类区块展示的商品数量（热度最高前 N 个）
const HOME_SECTION_PAGE_SIZE = 10;

/**
 * ✅ 不会 404 的 data-uri 占位图（灰色渐变）
 * 你后续想换成真实图片（public/ 或 Strapi 媒体）再改这里即可
 */
const HERO_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f4f6"/>
      <stop offset="1" stop-color="#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
</svg>`);

/**
 * ✅ 从 Strapi 读取 “导航栏可见”的顶级分类（parent 为空）
 * - show_in_nav = true
 * - sort by nav_order asc
 */
async function fetchNavTopCategories(): Promise<
  Array<{ slug: string; title: string; documentId: string }>
> {
  // Strapi v4/v5 兼容解析：data[i].attributes 或 data[i] 直出
  const qs =
    "/api/categories?" +
    "filters[show_in_nav][$eq]=true" +
    "&filters[parent][id][$null]=true" +
    "&sort[0]=nav_order:asc" +
    "&pagination[page]=1&pagination[pageSize]=50" +
    "&fields[0]=name&fields[1]=slug&fields[2]=nav_order&fields[3]=show_in_nav";

  const json: any = await api(qs, { noCache: true });
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];

  const out = rows
    .map((r) => {
      const a = r?.attributes ?? r ?? {};
      const slug = String(a?.slug ?? r?.slug ?? "").trim();
      const title = String(a?.name ?? a?.title ?? slug ?? "").trim();
      const documentId = String(a?.documentId ?? r?.documentId ?? "").trim();
      return { slug, title, documentId };
    })
    .filter((x) => x.slug && x.documentId);

  return out;
}

export default async function HomePage() {
  // ✅ 1) 主页分区：改为跟随 Strapi show_in_nav（顶级分类）
  const navTopCats = await fetchNavTopCategories();

  // ✅ 2) server 端算好每个 section 的 categoryDocIds（top + children）
  const sections = await Promise.all(
    navTopCats.map(async (cat) => {
      const topDocId = cat.documentId;

      const children = await fetchSubcategoriesByParentId(topDocId);
      const childIds = children.map((c: any) => c?.documentId).filter(Boolean);

      return {
        slug: cat.slug,
        title: cat.title,
        categoryDocIds: [topDocId, ...childIds] as string[],
      };
    })
  );

  return (
    <main className="w-full max-w-none pb-10">
      {/* ✅ 顶部：Banner + Marketing（三个入口） */}
      <section className="px-4 md:px-6 lg:px-8 pt-2 md:pt-3 space-y-6">
        {/* ✅ 新增：Strapi 驱动轮播海报（只 CTA 可点） */}
        <HomeBanner intervalMs={7000} />

        <div className="h-px bg-neutral-200" />

        {/* ✅ 顶部营销区：3 个核心入口（New Arrival / On Sale / Shoes） */}
        <HomeMarketingSection
          /**
           * ✅ New Arrival（上新主推）
           */
          leftHero={{
            title: "New Arrival",
            subtitle:
              "Fresh drops, curated weekly — discover new styles and limited restocks.",
            eyebrow: "NEW IN",
            ctaLabel: "Shop now", // ✅ 统一按钮文案
            href: "/category/new-in",
            image: HERO_DATA_URI,
            darkText: true,
            align: "left",
          }}
          /**
           * ✅ On Sale（理性转化入口）
           */
          rightTop={{
            title: "Sale Picks", // ✅ 不再重复 On Sale
            subtitle: "Selected styles at special prices — while stocks last.",
            eyebrow: "ON SALE",
            ctaLabel: "Shop now", // ✅ 统一按钮文案
            href: "/category/on-sale",
            image: HERO_DATA_URI,
            darkText: true, // ✅ 关键：统一为深色文字样式
            align: "left",
          }}
          /**
           * ✅ Shoes（核心品类主推）
           */
          rightBottom={{
            title: "Shoes",
            subtitle:
              "Small-foot friendly sizing + height-boost options. Find your perfect fit — no compromises.",
            eyebrow: "CORE CATEGORY",
            ctaLabel: "Shop now", // ✅ 统一按钮文案
            href: "/category/shoes",
            image: HERO_DATA_URI,
            darkText: true,
            align: "left",
          }}
        />

        <div className="h-px bg-neutral-200" />
      </section>

      {/* ✅ 首页分区：只渲染 show_in_nav=true 的分类 */}
      <div className="px-4 md:px-6 lg:px-8 space-y-12 pt-8">
        {sections.map((s) => {
        let displayTitle = s.title;

        // ✅ 只改这两个分类
        if (s.slug === "new-in") {
          displayTitle = "News In";
        }

        if (s.slug === "on-sale") {
          displayTitle = "Sales";
        }

        return (
          <HomeCategorySectionClient
            key={s.slug}
            slug={s.slug}
            title={displayTitle}
            categoryDocIds={s.categoryDocIds}
            pageSize={HOME_SECTION_PAGE_SIZE}
            displayCurrency="AUD"
          />
        );
      })}
      </div>
    </main>
  );
}
