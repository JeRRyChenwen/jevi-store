// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";
import CategoryGridClient from "./CategoryGridClient";

const STRAPI =
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://localhost:1337";

// 兜底顶级分类（防止没连上 Strapi 时至少有这 6 个）
const STATIC_SLUGS = ["shoes", "bottoms", "tops", "suit", "accessories", "outfit"];

/** 遍历全部分类（不依赖 populate[children]），拿到所有 slug */
async function fetchAllCategorySlugs(): Promise<string[]> {
  const set = new Set<string>(STATIC_SLUGS);
  let page = 1;
  const pageSize = 200;

  while (true) {
    const res = await fetch(
      `${STRAPI}/api/categories` +
        `?fields[0]=slug` +
        `&pagination[page]=${page}` +
        `&pagination[pageSize]=${pageSize}` +
        `&publicationState=live`,
      { headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    if (!res.ok) break;

    const json = await res.json();
    const rows: any[] = json?.data ?? [];
    for (const r of rows) {
      const s = r?.attributes?.slug ?? r?.slug;
      if (s) set.add(String(s));
    }

    const total = json?.meta?.pagination?.total ?? rows.length;
    if (page * pageSize >= total) break;
    page += 1;
  }

  return Array.from(set);
}

/** ① 生成静态路径：顶级兜底 + Strapi 返回的所有分类（含子分类） */
export async function generateStaticParams() {
  try {
    const all = await fetchAllCategorySlugs();
    return all.map((slug) => ({ slug }));
  } catch {
    // Strapi 取失败就只用兜底
    return STATIC_SLUGS.map((slug) => ({ slug }));
  }
}

// ✅ 与 output: export 兼容
export const dynamicParams = false;
export const dynamic = "force-static";

/** ② 根据 slug 取分类名（失败用 slug 兜底） */
async function getCategoryName(slug: string) {
  try {
    const res = await fetch(
      `${STRAPI}/api/categories?filters[slug][$eq]=${encodeURIComponent(
        slug
      )}&fields[0]=name&fields[1]=slug&publicationState=live`,
      { headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    if (!res.ok) return slug;
    const json = await res.json();
    return json?.data?.[0]?.attributes?.name || slug;
  } catch {
    return slug;
  }
}

/** ③ 统计该分类下商品总数（用 meta.pagination.total） */
async function getProductTotal(slug: string): Promise<number> {
  try {
    const res = await fetch(
      `${STRAPI}/api/products` +
        `?filters[category][slug][$eq]=${encodeURIComponent(slug)}` +
        `&fields[0]=id&pagination[pageSize]=1&publicationState=live`,
      { headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    if (!res.ok) return 0;
    const json = await res.json();
    return json?.meta?.pagination?.total ?? 0;
  } catch {
    return 0;
  }
}

// 👇 Next 15 的异步 params 需要 await
type ParamsPromise = Promise<{ slug: string }>;

export default async function CategoryPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { slug } = await params;

  const title = await getCategoryName(slug);
  if (!title) notFound();

  const total = await getProductTotal(slug);

  // （可选）演示模式：没有商品时给一个占位总数，避免页面空白
  const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
  const totalForUI = DEMO && total === 0 ? 120 : total;

  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <CategoryGridClient slug={slug} title={title} total={totalForUI} pageSize={40} />
    </main>
  );
}
