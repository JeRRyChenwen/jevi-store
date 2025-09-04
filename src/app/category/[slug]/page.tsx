// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
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
    return STATIC_SLUGS.map((slug) => ({ slug }));
  }
}

// ✅ 与 output: export 兼容
export const dynamicParams = false;
export const dynamic = "force-static";

/** ② 统计该分类下商品总数（用 meta.pagination.total） */
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

/** ③ 取“当前分类 + 它的顶级父分类 documentId”（若当前就是顶级，则父为自身） */
async function getCurrentAndRootDocId(slug: string): Promise<{
  current: { name: string; slug: string; documentId?: string };
  rootDocId?: string;
}> {
  const url =
    `${STRAPI}/api/categories` +
    `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=name&fields[1]=slug&fields[2]=documentId` +
    `&populate[parent][fields][0]=documentId` +
    `&populate[parent][fields][1]=slug` +
    `&publicationState=live`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  if (!res.ok) {
    return { current: { name: slug, slug } };
  }

  const json = await res.json();
  const row = json?.data?.[0];
  if (!row) return { current: { name: slug, slug } };

  const current = {
    name: row?.name ?? row?.attributes?.name ?? slug,
    slug: row?.slug ?? row?.attributes?.slug ?? slug,
    documentId: row?.documentId ?? row?.attributes?.documentId,
  };

  const parentNode =
    row?.attributes?.parent?.data ??
    row?.parent?.data ??
    row?.attributes?.parent ??
    row?.parent;

  const parentDocId =
    parentNode?.documentId ??
    parentNode?.attributes?.documentId ??
    parentNode?.id ??
    undefined;

  const rootDocId = parentDocId || current.documentId;
  return { current, rootDocId };
}

/** ④ 根据“顶级父分类 documentId”取它的所有子分类（兄弟） */
async function getRootChildren(rootDocId?: string): Promise<
  Array<{ name: string; slug: string; documentId?: string; nav_order?: number }>
> {
  if (!rootDocId) return [];
  try {
    const res = await fetch(
      `${STRAPI}/api/categories` +
        `?filters[parent][documentId][$eq]=${encodeURIComponent(rootDocId)}` +
        `&fields[0]=name&fields[1]=slug&fields[2]=documentId&fields[3]=nav_order` +
        `&sort[0]=nav_order:asc&sort[1]=name:asc` +
        `&pagination[pageSize]=200&publicationState=live`,
      { headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = json?.data ?? [];
    return list.map((c) => ({
      name: c?.name ?? c?.attributes?.name ?? "",
      slug: c?.slug ?? c?.attributes?.slug ?? "",
      documentId: c?.documentId ?? c?.attributes?.documentId,
      nav_order: c?.nav_order ?? c?.attributes?.nav_order,
    }));
  } catch {
    return [];
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

  const [{ current, rootDocId }, total] = await Promise.all([
    getCurrentAndRootDocId(slug),
    getProductTotal(slug),
  ]);

  if (!current?.slug) notFound();

  const siblings = await getRootChildren(rootDocId);

  // （可选）演示模式：没有商品时给一个占位总数，避免页面空白
  const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
  const totalForUI = DEMO && total === 0 ? 120 : total;

  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      {/* 子分类跳转按钮（放在标题上方；按钮更大） */}
      {siblings.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {siblings.map((s) => {
            const active = s.slug === slug;
            const base =
              "rounded-full border px-4 md:px-5 py-2 md:py-2.5 text-sm md:text-base font-medium";
            const cls = active
              ? `${base} bg-black text-white border-black`
              : `${base} border-neutral-300 text-neutral-800 hover:bg-neutral-50`;
            return (
              <Link key={s.slug} href={`/category/${s.slug}`} className={cls} aria-current={active ? "page" : undefined}>
                {s.name || s.slug}
              </Link>
            );
          })}
        </div>
      )}

      {/* 不再在这里渲染标题/Category，避免与 Grid 内部重复 */}
      <div className="mt-2">
        <CategoryGridClient slug={slug} title={current.name} total={totalForUI} pageSize={40} />
      </div>
    </main>
  );
}
