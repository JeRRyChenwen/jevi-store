// src/app/(shop)/page.tsx
import {
  fetchTopLevelCategoryDocIdMap,
  fetchSubcategoriesByParentId,
} from "@/lib/strapi";

// ✅ 复用 category card 的首页分区（Client）
import HomeCategorySectionClient from "@/components/home/HomeCategorySectionClient";

// （可选）你原来的首页营销区/hero 区如果想要保留，继续 import 回来即可
// import HomeHeroGrid from "@/components/home/HomeHeroGrid";

export const revalidate = 0;

const HOME_SECTIONS = [
  { slug: "shoes", title: "Shoes" },
  { slug: "bottoms", title: "Bottoms" },
  { slug: "tops", title: "Tops" },
  { slug: "suit", title: "Suit" },
  { slug: "accessories", title: "Accessories" },
  { slug: "outfit", title: "Outfit" },
];

export default async function HomePage() {
  const topMap = await fetchTopLevelCategoryDocIdMap();

  // ✅ 在 server 端算好每个 section 的 categoryDocIds（top + children）
  const sections = await Promise.all(
    HOME_SECTIONS.map(async (sec) => {
      const topDocId = topMap[sec.slug];
      if (!topDocId) {
        return { ...sec, categoryDocIds: [] as string[] };
      }

      const children = await fetchSubcategoriesByParentId(topDocId);
      const childIds = children.map((c) => c.documentId).filter(Boolean);
      const docIds = [topDocId, ...childIds];

      return { ...sec, categoryDocIds: docIds };
    })
  );

  return (
    <main className="w-full max-w-none pt-2 md:pt-3 pb-10">
      {/* ✅ 你之前“原本的内容”如果是 HomeHeroGrid / banner 区域，就把它放回这里即可 */}
      {/* 
      <HomeHeroGrid
        sideLeft={SIDE_LEFT}
        leftHero={LEFT_HERO}
        hero={HERO}
        rightTop={RIGHT_TOP}
        rightBottom={RIGHT_BOTTOM}
      />
      */}

      <div className="px-4 md:px-6 lg:px-8 space-y-12">
        {sections.map((s) => (
          <HomeCategorySectionClient
            key={s.slug}
            slug={s.slug}
            title={s.title}
            categoryDocIds={s.categoryDocIds}
            pageSize={8}          // ✅ 首页每个区展示多少个（你可调）
            displayCurrency="AUD"
          />
        ))}
      </div>
    </main>
  );
}
