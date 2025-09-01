// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";

// 和 CategoryBar 的 href 一致
const CATEGORIES = [
  { slug: "new-in",       title: "New In" },
  { slug: "women",        title: "Women" },
  { slug: "men",          title: "Men" },
  { slug: "beauty",       title: "Beauty" },
  { slug: "home",         title: "Home" },
  { slug: "travel-tech",  title: "Travel & Tech" },
  { slug: "kids",         title: "Kids" },
  { slug: "toys",         title: "Toys" },
  { slug: "gifts",        title: "Gifts" },
  { slug: "sale",         title: "Sale" },
  { slug: "myer-one",     title: "MYER one" },
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

  return (
    // ✅ 全宽：去掉 max-w-7xl，使用 w-full max-w-none
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{cat.title}</h1>
        <p className="text-neutral-600">
          Category: <code className="font-mono">{slug}</code>
        </p>
      </header>

      {/* ✅ 更密集的网格：大屏继续加列，铺满左右 */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-4 h-48 flex items-center justify-center text-neutral-400"
            >
              Product #{i + 1}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
