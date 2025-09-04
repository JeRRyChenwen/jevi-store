// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";
import CategoryGridClient from "./CategoryGridClient";

const STRAPI =
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://localhost:1337";

// 永远包含的静态兜底分类（确保 output:export 不缺路由）
const STATIC_SLUGS = ["shoes", "bottoms", "tops", "suit", "accessories", "outfit"];

/** ① 生成所有静态路由：静态兜底 +（可选）Strapi 返回的顶级/子级 */
export async function generateStaticParams() {
  const set = new Set<string>(STATIC_SLUGS);
  try {
    const res = await fetch(
      `${STRAPI}/api/categories?populate[children]=true&pagination[pageSize]=500`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const json = await res.json();
      for (const c of json?.data ?? []) {
        const s = c?.attributes?.slug;
        if (s) set.add(s);
        for (const sc of c?.attributes?.children?.data ?? []) {
          const ss = sc?.attributes?.slug;
          if (ss) set.add(ss);
        }
      }
    }
  } catch {
    // 忽略：保留 STATIC_SLUGS 即可
  }
  return Array.from(set).map((slug) => ({ slug }));
}

export const dynamicParams = false;
export const dynamic = "force-static";

/** ② 根据 slug 取分类名（失败就用 slug 兜底） */
async function getCategoryName(slug: string) {
  try {
    const res = await fetch(
      `${STRAPI}/api/categories?filters[slug][$eq]=${encodeURIComponent(
        slug
      )}&fields[0]=name&fields[1]=slug`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) return slug;
    const json = await res.json();
    return json?.data?.[0]?.attributes?.name || slug;
  } catch {
    return slug;
  }
}

type ParamsPromise = Promise<{ slug: string }>; // 👈 params 是 Promise

export default async function CategoryPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { slug } = await params; // 👈 这里要 await
  const title = await getCategoryName(slug);

  // TODO: 接后端后用真实 total
  const TOTAL_PRODUCTS = 137;

  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <CategoryGridClient slug={slug} title={title} total={TOTAL_PRODUCTS} pageSize={40} />
    </main>
  );
}
