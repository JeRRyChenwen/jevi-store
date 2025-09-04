// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import CategoryGridClient from "./CategoryGridClient";

const STRAPI =
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://localhost:1337";

// 兜底顶级分类
const STATIC_SLUGS = ["shoes", "bottoms", "tops", "suit", "accessories", "outfit"];

/** 拉全量分类 slug（不依赖 populate） */
async function fetchAllCategorySlugs(): Promise<string[]> {
  const set = new Set<string>(STATIC_SLUGS);
  let page = 1;
  const pageSize = 200;

  while (true) {
    const res = await fetch(
      `${STRAPI}/api/categories?fields[0]=slug&pagination[page]=${page}&pagination[pageSize]=${pageSize}&publicationState=live`,
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

/** 生成静态路径 */
export async function generateStaticParams() {
  try {
    const all = await fetchAllCategorySlugs();
    return all.map((slug) => ({ slug }));
  } catch {
    return STATIC_SLUGS.map((slug) => ({ slug }));
  }
}

// 与 output:export 兼容
export const dynamicParams = false;
export const dynamic = "force-static";

/** 取当前分类 + 父信息（用来判断是否顶级） */
async function getCurrentWithParent(slug: string): Promise<{
  current: { name: string; slug: string; documentId?: string };
  parentDocId?: string; // 若存在则是子分类
}> {
  const url =
    `${STRAPI}/api/categories` +
    `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=name&fields[1]=slug&fields[2]=documentId` +
    `&populate[parent][fields][0]=documentId` +
    `&publicationState=live`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  if (!res.ok) return { current: { name: slug, slug } };

  const json = await res.json();
  const row = json?.data?.[0];
  if (!row) return { current: { name: slug, slug } };

  const current = {
    name: row?.name ?? row?.attributes?.name ?? slug,
    slug: row?.slug ?? row?.attributes?.slug ?? slug,
    documentId: row?.documentId ?? row?.attributes?.documentId,
  };

  const parentNode = row?.attributes?.parent?.data ?? row?.parent?.data;
  const parentDocId =
    parentNode?.documentId ?? parentNode?.attributes?.documentId ?? undefined;

  return { current, parentDocId };
}

/** 取“某顶级分类”的所有直接子分类的 docId 列表 */
async function getChildrenDocIds(rootDocId?: string): Promise<string[]> {
  if (!rootDocId) return [];
  try {
    const res = await fetch(
      `${STRAPI}/api/categories` +
        `?filters[parent][documentId][$eq]=${encodeURIComponent(rootDocId)}` +
        `&fields[0]=documentId` +
        `&pagination[pageSize]=200&publicationState=live`,
      { headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = json?.data ?? [];
    return list
      .map((c) => c?.documentId ?? c?.attributes?.documentId)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** 统计商品总数：支持 docId 列表（$in）或单 slug */
async function getProductTotal(opts: { slug?: string; categoryDocIds?: string[] }): Promise<number> {
  const qs =
    opts.categoryDocIds?.length
      ? `/api/products?filters[category][documentId][$in]=${opts.categoryDocIds
          .map(encodeURIComponent)
          .join(",")}&fields[0]=id&pagination[pageSize]=1&publicationState=live`
      : `/api/products?filters[category][slug][$eq]=${encodeURIComponent(
          opts.slug || ""
        )}&fields[0]=id&pagination[pageSize]=1&publicationState=live`;

  try {
    const res = await fetch(`${STRAPI}${qs}`, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return json?.meta?.pagination?.total ?? 0;
  } catch {
    return 0;
  }
}

/** 取兄弟子分类（用于顶部按钮） */
async function getSiblings(rootDocId?: string): Promise<Array<{ name: string; slug: string }>> {
  if (!rootDocId) return [];
  try {
    const res = await fetch(
      `${STRAPI}/api/categories` +
        `?filters[parent][documentId][$eq]=${encodeURIComponent(rootDocId)}` +
        `&fields[0]=name&fields[1]=slug&fields[2]=nav_order` +
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
    }));
  } catch {
    return [];
  }
}

// Next 15: params 需要 await
type ParamsPromise = Promise<{ slug: string }>;

export default async function CategoryPage({ params }: { params: ParamsPromise }) {
  const { slug } = await params;

  // 1) 当前分类与父信息
  const { current, parentDocId } = await getCurrentWithParent(slug);
  if (!current?.slug) notFound();

  // 2) 判断是否顶级分类
  const isTopLevel = !parentDocId; // 没有父 → 顶级
  const rootDocId = isTopLevel ? current.documentId : parentDocId;

  // 3) 顶部兄弟子分类按钮（若是顶级，就显示它的所有子分类；若是子分类，也显示同一顶级下的兄弟）
  const siblings = await getSiblings(rootDocId);

  // 4) 计算商品查询范围：
  //   - 顶级分类：自己 + 其所有直接子分类 docId（union）
  //   - 子分类：只查自己
  let categoryDocIdsForPage: string[] | undefined = undefined;
  if (isTopLevel && rootDocId) {
    const childrenIds = await getChildrenDocIds(rootDocId);
    categoryDocIdsForPage = [rootDocId, ...childrenIds];
  }

  // 5) 真实商品总数
  const total = await getProductTotal(
    categoryDocIdsForPage?.length
      ? { categoryDocIds: categoryDocIdsForPage }
      : { slug }
  );

  // （可选）演示：无数据也显示占位
  const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
  const totalForUI = DEMO && total === 0 ? 120 : total;

  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      {/* 顶部兄弟子分类按钮 */}
      {siblings.length > 0 && (
        <div className="flex flex-wrap gap-y-3 md:gap-y-4 gap-x-8 md:gap-x-12 mb-3 md:mb-4">
          {siblings.map((s) => {
            const active = s.slug === slug;
            const base =
              "rounded-full border px-6 md:px-8 py-3 md:py-3.5 text-base md:text-lg font-semibold whitespace-nowrap";
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

      {/* 商品网格：把 union 的 docId 列表传给子组件 */}
      <div className="mt-2">
        <CategoryGridClient
          slug={slug}
          title={current.name}
          total={totalForUI}
          pageSize={40}
          categoryDocIds={categoryDocIdsForPage} // 👈 新增
        />
      </div>
    </main>
  );
}
