// src/app/category/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import CategoryGridClient from "./CategoryGridClient";
import { api } from "@/lib/strapi";

// 兜底顶级分类（防止没连上 Strapi 时至少有这 6 个）
const STATIC_SLUGS = ["shoes", "bottoms", "tops", "suit", "accessories", "outfit"];

/** 遍历全部分类（不依赖 populate[children]），拿到所有 slug */
async function fetchAllCategorySlugs(): Promise<string[]> {
  const set = new Set<string>(STATIC_SLUGS);
  let page = 1;
  const pageSize = 200;

  try {
    // 分页把所有 category 的 slug 都取回来
    // 说明：用 api() 会自动加 token，Public 读权限关闭也没问题
    while (true) {
      const json: any = await api(
        `/api/categories` +
          `?fields[0]=slug` +
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `&publicationState=live`,
        { noCache: true }
      );

      const rows: any[] = json?.data ?? [];
      for (const r of rows) {
        const s = r?.attributes?.slug ?? r?.slug;
        if (s) set.add(String(s));
      }

      const total = Number(json?.meta?.pagination?.total ?? rows.length);
      if (page * pageSize >= total) break;
      page += 1;
    }
  } catch {
    // 忽略错误，返回兜底
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

// ✅ 与 output: export 兼容（现在你已去掉 output: 'export'，保留该静态策略即可）
export const dynamic = "force-static";

/** 统计商品总数：支持 slug 或 documentId 列表（$in） */
async function getProductTotal(opts: {
  slug?: string;
  categoryDocIds?: string[];
}): Promise<number> {
  const { slug, categoryDocIds } = opts;

  const filterPart = categoryDocIds?.length
    ? categoryDocIds
        .map(
          (id, i) =>
            `filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`
        )
        .join("&")
    : `filters[category][slug][$eq]=${encodeURIComponent(slug || "")}`;

  try {
    const json: any = await api(
      `/api/products?${filterPart}` +
        `&fields[0]=id&pagination[pageSize]=1&publicationState=live`,
      { noCache: true }
    );
    return Number(json?.meta?.pagination?.total ?? 0);
  } catch {
    return 0;
  }
}

/** 取“当前分类 + 顶级父分类 documentId”（若当前就是顶级，则父为自身） */
async function getCurrentAndRootDocId(slug: string): Promise<{
  current: { name: string; slug: string; documentId?: string };
  rootDocId?: string;
}> {
  try {
    const json: any = await api(
      `/api/categories` +
        `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
        `&fields[0]=name&fields[1]=slug&fields[2]=documentId` +
        `&populate[parent][fields][0]=documentId` +
        `&populate[parent][fields][1]=slug` +
        `&publicationState=live`,
      { noCache: true }
    );

    const row = json?.data?.[0];
    if (!row) return { current: { name: slug, slug } };

    const current = {
      name: row?.attributes?.name ?? row?.name ?? slug,
      slug: row?.attributes?.slug ?? row?.slug ?? slug,
      documentId: row?.attributes?.documentId ?? row?.documentId,
    };

    const parentNode =
      row?.attributes?.parent?.data ??
      row?.parent?.data ??
      row?.attributes?.parent ??
      row?.parent;

    const parentDocId =
      parentNode?.attributes?.documentId ??
      parentNode?.documentId ??
      parentNode?.id ??
      undefined;

    const rootDocId = parentDocId || current.documentId;
    return { current, rootDocId };
  } catch {
    return { current: { name: slug, slug } };
  }
}

/** 根据“顶级父分类 documentId”取它的所有子分类（兄弟） */
async function getRootChildren(rootDocId?: string): Promise<
  Array<{ name: string; slug: string; documentId?: string; nav_order?: number }>
> {
  if (!rootDocId) return [];
  try {
    const json: any = await api(
      `/api/categories` +
        `?filters[parent][documentId][$eq]=${encodeURIComponent(rootDocId)}` +
        `&fields[0]=name&fields[1]=slug&fields[2]=documentId&fields[3]=nav_order` +
        `&sort[0]=nav_order:asc&sort[1]=name:asc` +
        `&pagination[pageSize]=200` +
        `&publicationState=live`,
      { noCache: true }
    );
    const list: any[] = json?.data ?? [];
    return list.map((c) => ({
      name: c?.attributes?.name ?? c?.name ?? "",
      slug: c?.attributes?.slug ?? c?.slug ?? "",
      documentId: c?.attributes?.documentId ?? c?.documentId,
      nav_order: c?.attributes?.nav_order ?? c?.nav_order,
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

  // 1) 当前分类 + 顶级父分类 docId
  const [{ current, rootDocId }] = await Promise.all([
    getCurrentAndRootDocId(slug),
  ]);

  if (!current?.slug) notFound();

  // 2) 拿到顶级父分类的所有子分类（兄弟 = 顶级的 children）
  const siblings = await getRootChildren(rootDocId);

  // 3) 如果当前就是顶级分类：把“自己 + 所有子分类”的 documentId 组成一个列表
  //    用于产品过滤（$in）与 total 统计；否则子分类页面只看自己
  let categoryDocIds: string[] | undefined;
  const isTop =
    current.documentId && rootDocId && current.documentId === rootDocId;

  if (isTop) {
    const childIds = siblings
      .map((s) => s.documentId)
      .filter((x): x is string => Boolean(x));
    categoryDocIds = [current.documentId!, ...childIds];
  }

  // 4) 统计总数：顶级走 $in，子级走 slug
  const total = await getProductTotal({
    slug: isTop ? undefined : slug,
    categoryDocIds,
  });

  // （可选）演示模式：没有商品时给一个占位总数，避免页面空白
  const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
  const totalForUI = DEMO && total === 0 ? 120 : total;

  return (
    <main className="w-full max-w-none px-4 md:px-6 lg:px-8 py-8 space-y-6">
      {/* 子分类跳转按钮（放在标题上方；按钮更大） */}
      {siblings.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-2">
          {siblings.map((s) => {
            const active = s.slug === slug;
            const base =
              "rounded-full border px-12 md:px-14 py-7 md:py-6 text-base md:text-lg font-semibold whitespace-nowrap";
            const cls = active
              ? `${base} bg-black text-white border-black`
              : `${base} border-neutral-300 text-neutral-800 hover:bg-neutral-50`;
            return (
              <Link
                key={s.slug}
                href={`/category/${s.slug}`}
                className={cls}
                aria-current={active ? "page" : undefined}
              >
                {s.name || s.slug}
              </Link>
            );
          })}
        </div>
      )}

      {/* 列表：把顶级的 docId 列表传下去，子级则不传 */}
      <div className="mt-2">
        <CategoryGridClient
          slug={slug}
          title={current.name}
          total={totalForUI}
          pageSize={40}
          categoryDocIds={categoryDocIds}
        />
      </div>
    </main>
  );
}
