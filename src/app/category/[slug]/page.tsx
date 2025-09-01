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

      <section>
        {/* 固定为 4 列：在 lg、xl、2xl 断点都锁为 4；小屏还是 2 / 3 列自适应 */}
        <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <article
              key={i}
              className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* 更大的可视区：比例更高（4:3），随宽度自适应变高 */}
              <div className="aspect-[4/3] bg-muted">
                {/* 先用占位，接 Strapi 后换成 <img /> */}
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  Image #{i + 1}
                </div>
                {/* 真实图时：
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                */}
              </div>

              {/* 放大内容区：更大的 padding / 字号 */}
              <div className="p-6 md:p-8">
                <h3 className="text-lg md:text-xl font-semibold">Product #{i + 1}</h3>
                <p className="mt-1 text-sm md:text-base text-muted-foreground line-clamp-2">
                  Short description goes here…
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xl md:text-2xl font-bold">$129</span>
                  <button className="rounded-full px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base bg-primary text-primary-foreground transition-opacity hover:opacity-90">
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
