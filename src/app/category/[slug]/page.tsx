// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";
import CategoryGridClient from "./CategoryGridClient";

// 和 CategoryBar 的 href 一致（只保留这 6 个）
const CATEGORIES = [
  { slug: "shoes",       title: "Shoes" },
  { slug: "bottoms",     title: "Bottoms" },
  { slug: "tops",        title: "Tops" },
  { slug: "suit",        title: "Suit" },
  { slug: "accessories", title: "Accessories" },
  { slug: "outfit",      title: "Outfit" },
];

// 静态导出需要列出所有 slug
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = false;
export const dynamic = "force-static";

type ParamsPromise = Promise<{ slug: string }>;

export default async function CategoryPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return notFound();

  // TODO: 接后端后用真实 total
  const TOTAL_PRODUCTS = 137;

  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <CategoryGridClient
        slug={slug}
        title={cat.title}
        total={TOTAL_PRODUCTS}
        pageSize={40} // 每页最多 40 个
      />
    </main>
  );
}
