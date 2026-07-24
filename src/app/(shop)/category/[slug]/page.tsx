// src/app/(shop)/category/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import CategoryGridClient from "./CategoryGridClient";
import { api } from "@/lib/strapi";
import { BRAND } from "@/lib/brand";
import { CURRENT_STOREFRONT } from "@/lib/market/current";
import {
  normalizeProduct,
  type ProductLite,
} from "./_lib/categoryProductMapper";
import CategoryBuyingGuide from "./_components/CategoryBuyingGuide";

// 兜底顶级分类（防止没连上 Strapi 时至少有这些分类页）
const STATIC_SLUGS = [
  "shoes",
  "casual-shoes",
  "formal-shoes",
  "bottoms",
  "tops",
  "suit",
  "accessories",
  "outfit",
  "new-in",
  "on-sale",
];

// 这两个是“聚合页”slug：不按 category 关系过滤
const PROMO_SLUGS = new Set(["new-in", "on-sale"]);
const isPromoSlug = (slug: string) => PROMO_SLUGS.has(slug);

type CategorySeoContent = {
  title: string;
  description: string;
  introduction: string;
};

const CATEGORY_SEO_CONTENT: Record<string, CategorySeoContent> = {
  shoes: {
    title: "Elevator & Height Increasing Shoes Australia",
    description:
      "Shop elevator shoes and height-increasing sneakers designed for discreet added height, everyday comfort and modern style, with delivery across Australia.",
    introduction:
      "Explore our collection of discreet elevator shoes and height-increasing sneakers designed for comfortable everyday wear.",
  },

  "new-in": {
    title: "New Height Increasing & Elevator Shoes",
    description:
      "Discover the latest elevator shoes and height-increasing sneakers from JEVI APPAREL STUDIO, with new styles available for delivery across Australia.",
    introduction:
      "Explore our latest height-increasing shoes, including newly arrived sneakers, boots and everyday elevator styles.",
  },

  "on-sale": {
    title: "Height Increasing & Elevator Shoes Sale",
    description:
      "Shop selected elevator shoes and height-increasing sneakers on sale at JEVI APPAREL STUDIO, with delivery available across Australia.",
    introduction:
      "Discover selected height-increasing shoes and elevator sneakers at reduced prices while available.",
  },

  "casual-shoes": {
    title: "Casual Height Increasing & Elevator Shoes",
    description:
      "Shop casual height-increasing shoes and discreet elevator sneakers designed for comfort, everyday wear and delivery across Australia.",
    introduction:
      "Discover casual elevator shoes and height-increasing sneakers designed to add discreet height to everyday outfits.",
  },

  "formal-shoes": {
    title: "Formal Height Increasing & Elevator Shoes",
    description:
      "Shop formal elevator shoes designed to provide discreet added height with a polished appearance for work, events and special occasions.",
    introduction:
      "Explore formal height-increasing shoes designed for discreet elevation and a polished, confident appearance.",
  },
};

type CategoryNavItem = {
  name: string;
  slug: string;
  documentId?: string;
  nav_order?: number;
};

type CategoryCurrent = {
  name: string;
  slug: string;
  documentId?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  children?: CategoryNavItem[];
};

function titleizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** 遍历全部分类（不依赖 populate[children]），拿到所有 slug */
async function fetchAllCategorySlugs(): Promise<string[]> {
  const set = new Set<string>(STATIC_SLUGS);
  let page = 1;
  const pageSize = 200;

  try {
    while (true) {
      const json: any = await api(
        `/api/categories` +
          `?fields[0]=slug` +
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `&publicationState=live`,
        { noCache: true },
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

/** 生成静态路径：顶级兜底 + Strapi 返回的所有分类（含子分类） */
export async function generateStaticParams() {
  try {
    const all = await fetchAllCategorySlugs();
    return all.map((slug) => ({ slug }));
  } catch {
    return STATIC_SLUGS.map((slug) => ({ slug }));
  }
}

export const dynamic = "force-static";

/**
 * promo 聚合页过滤：
 * on-sale:
 *   当前币种的 prices.sale_starts_at <= now
 *   且 prices.sale_ends_at 为空或 >= now
 *
 * new-in:
 *   Product.new_starts_at <= now
 *   且 Product.new_ends_at 为空或 >= now
 */
function buildPromoProductFilters(
  slug: string,
  nowISO: string,
  currencyCode: string,
): string[] {
  const parts: string[] = [];

  if (slug === "on-sale") {
    const currency = String(currencyCode || "AUD")
      .trim()
      .toUpperCase();

    parts.push(
      `filters[$and][0][prices][currency][$eq]=${encodeURIComponent(currency)}`,
    );

    // discount 小于 100，表示存在有效折扣
    parts.push(`filters[$and][1][prices][discount][$lt]=100`);

    // sale_starts_at 为空则立即生效，否则必须已经开始
    parts.push(`filters[$and][2][$or][0][prices][sale_starts_at][$null]=true`);
    parts.push(
      `filters[$and][2][$or][1][prices][sale_starts_at][$lte]=${encodeURIComponent(
        nowISO,
      )}`,
    );

    // sale_ends_at 为空则长期有效，否则必须尚未结束
    parts.push(`filters[$and][3][$or][0][prices][sale_ends_at][$null]=true`);
    parts.push(
      `filters[$and][3][$or][1][prices][sale_ends_at][$gte]=${encodeURIComponent(
        nowISO,
      )}`,
    );

    return parts;
  }

  if (slug === "new-in") {
    parts.push(`filters[new_starts_at][$notNull]=true`);
    parts.push(`filters[new_starts_at][$lte]=${encodeURIComponent(nowISO)}`);
    parts.push(`filters[$or][0][new_ends_at][$null]=true`);
    parts.push(
      `filters[$or][1][new_ends_at][$gte]=${encodeURIComponent(nowISO)}`,
    );

    return parts;
  }

  return parts;
}

/** 统计商品总数：支持 slug 或 documentId 列表（$in）；支持 promo 聚合页 */
async function getProductTotal(opts: {
  slug?: string;
  categoryDocIds?: string[];
}): Promise<number> {
  const { slug, categoryDocIds } = opts;

  // promo 聚合页：不按 category 过滤
  if (slug && isPromoSlug(slug)) {
    const nowISO = new Date().toISOString();
    const parts: string[] = [];

    // 只展示「被上架显示」的商品
    parts.push(`filters[is_showed][$eq]=true`);
    parts.push(
      ...buildPromoProductFilters(
        slug,
        nowISO,
        CURRENT_STOREFRONT.defaultCurrency,
      ),
    );

    try {
      const json: any = await api(
        `/api/products?${parts.join("&")}` +
          `&fields[0]=id&pagination[pageSize]=1&publicationState=live`,
        { noCache: true },
      );
      return Number(json?.meta?.pagination?.total ?? 0);
    } catch {
      return 0;
    }
  }

  // 普通分类页：按 category 过滤
  const filterPart = categoryDocIds?.length
    ? categoryDocIds
        .map(
          (id, i) =>
            `filters[category][documentId][$in][${i}]=${encodeURIComponent(
              id,
            )}`,
        )
        .join("&")
    : `filters[category][slug][$eq]=${encodeURIComponent(slug || "")}`;

  try {
    const json: any = await api(
      `/api/products?${filterPart}` +
        `&fields[0]=id&pagination[pageSize]=1&publicationState=live`,
      { noCache: true },
    );
    return Number(json?.meta?.pagination?.total ?? 0);
  } catch {
    return 0;
  }
}

/** 获取首屏商品，使搜索引擎无需等待客户端请求 */
async function getInitialProducts(opts: {
  slug?: string;
  categoryDocIds?: string[];
  pageSize?: number;
}): Promise<ProductLite[]> {
  const { slug, categoryDocIds, pageSize = 40 } = opts;
  const parts: string[] = [];

  if (slug && isPromoSlug(slug)) {
    const nowISO = new Date().toISOString();

    parts.push(
      ...buildPromoProductFilters(
        slug,
        nowISO,
        CURRENT_STOREFRONT.defaultCurrency,
      ),
    );
  } else if (categoryDocIds?.length) {
    categoryDocIds.forEach((id, index) => {
      parts.push(
        `filters[category][documentId][$in][${index}]=${encodeURIComponent(id)}`,
      );
    });
  } else if (slug) {
    parts.push(`filters[category][slug][$eq]=${encodeURIComponent(slug)}`);
  }

  parts.push(`filters[is_showed][$eq]=true`);

  const query =
    `/api/products?${parts.join("&")}` +
    `&fields[0]=title&fields[1]=slug` +
    `&fields[2]=hot_score&fields[3]=priority` +
    `&fields[4]=new_starts_at&fields[5]=new_ends_at` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][card_image]=true` +
    `&populate[color_galleries][populate][images]=true` +
    `&populate[variants][fields][0]=color` +
    `&populate[variants][fields][1]=size` +
    `&populate[prices]=*` +
    `&pagination[page]=1&pagination[pageSize]=${pageSize}` +
    `&sort[0]=priority:asc&sort[1]=updatedAt:desc` +
    `&publicationState=live`;

  try {
    const json: any = await api(query, { noCache: true });
    const rows: any[] = Array.isArray(json?.data) ? json.data : [];

    return rows.map(normalizeProduct);
  } catch (error) {
    console.error("[CategoryPage] Failed to load initial products:", error);
    return [];
  }
}

/** 取“当前分类 + 顶级父分类 documentId”（若当前就是顶级，则父为自身） */
async function getCurrentAndRootDocId(slug: string): Promise<{
  current: CategoryCurrent;
  rootDocId?: string;
}> {
  try {
    const json: any = await api(
      `/api/categories` +
        `?filters[slug][$eq]=${encodeURIComponent(slug)}` +
        `&fields[0]=name` +
        `&fields[1]=slug` +
        `&fields[2]=documentId` +
        `&fields[3]=description` +
        `&fields[4]=seo_title` +
        `&fields[5]=seo_description` +
        `&populate[parent][fields][0]=documentId` +
        `&populate[parent][fields][1]=slug` +
        `&populate[children][fields][0]=name` +
        `&populate[children][fields][1]=slug` +
        `&populate[children][fields][2]=documentId` +
        `&populate[children][fields][3]=nav_order` +
        `&publicationState=live`,
      { noCache: true },
    );

    const row = json?.data?.[0];

    if (!row) {
      return {
        current: {
          name: titleizeSlug(slug),
          slug,
        },
      };
    }

    const rawChildren =
      row?.attributes?.children?.data ??
      row?.children?.data ??
      row?.attributes?.children ??
      row?.children ??
      [];

    const children: CategoryNavItem[] = Array.isArray(rawChildren)
      ? rawChildren
          .map((child: any) => ({
            name:
              child?.attributes?.name ??
              child?.name ??
              titleizeSlug(child?.attributes?.slug ?? child?.slug ?? ""),
            slug: child?.attributes?.slug ?? child?.slug ?? "",
            documentId: child?.attributes?.documentId ?? child?.documentId,
            nav_order: child?.attributes?.nav_order ?? child?.nav_order,
          }))
          .filter((child) => Boolean(child.slug))
          .sort(
            (a, b) =>
              (a.nav_order ?? Number.MAX_SAFE_INTEGER) -
                (b.nav_order ?? Number.MAX_SAFE_INTEGER) ||
              a.name.localeCompare(b.name),
          )
      : [];

    const current: CategoryCurrent = {
      name: row?.attributes?.name ?? row?.name ?? titleizeSlug(slug),
      slug: row?.attributes?.slug ?? row?.slug ?? slug,
      documentId: row?.attributes?.documentId ?? row?.documentId,
      description: row?.attributes?.description ?? row?.description ?? "",
      seo_title: row?.attributes?.seo_title ?? row?.seo_title ?? "",
      seo_description:
        row?.attributes?.seo_description ?? row?.seo_description ?? "",
      children,
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
    return {
      current: {
        name: titleizeSlug(slug),
        slug,
      },
    };
  }
}

/** 根据“顶级父分类 documentId”取它的所有子分类（兄弟） */
async function getRootChildren(
  rootDocId?: string,
): Promise<
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
      { noCache: true },
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

// Next 15 的异步 params 需要 await
type ParamsPromise = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const { slug } = await params;

  const { current } = await getCurrentAndRootDocId(slug);

  const name = current?.name || titleizeSlug(slug);
  const pageSlug = current?.slug || slug;

  const seoContent = CATEGORY_SEO_CONTENT[pageSlug];

  const title =
    seoContent?.title || current?.seo_title || `${name} | Shop ${name} Online`;

  const description =
    seoContent?.description ||
    current?.seo_description ||
    current?.description ||
    `Shop ${BRAND.displayName}'s ${name} collection online. Discover modern apparel, footwear and lifestyle essentials.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/category/${pageSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `/category/${pageSlug}`,
      type: "website",
      siteName: BRAND.displayName,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { slug } = await params;

  const [{ current, rootDocId }] = await Promise.all([
    getCurrentAndRootDocId(slug),
  ]);

  if (!current?.slug) notFound();

  const seoContent = CATEGORY_SEO_CONTENT[current.slug];

  // promo 聚合页：不展示子分类导航
  const promo = isPromoSlug(slug);

  let siblings: CategoryNavItem[] = [];

  if (!promo) {
    if (current.children?.length) {
      // 当前是父分类，例如 Shoes：
      // 直接使用当前分类返回的 children。
      siblings = current.children;
    } else if (rootDocId && rootDocId !== current.documentId) {
      // 当前是子分类，例如 Casual Shoes：
      // 获取同一个父分类下的兄弟分类。
      siblings = await getRootChildren(rootDocId);
    }
  }

  let categoryDocIds: string[] | undefined;

  const isTop =
    !promo &&
    current.documentId &&
    rootDocId &&
    current.documentId === rootDocId;

  if (isTop) {
    const childIds = siblings
      .map((s) => s.documentId)
      .filter((x): x is string => Boolean(x));

    categoryDocIds = [current.documentId!, ...childIds];
  }

  const PAGE_SIZE = 40;

  const productQueryOptions = {
    slug: isTop ? undefined : slug,
    categoryDocIds,
  };

  const [total, initialProducts] = await Promise.all([
    getProductTotal(productQueryOptions),
    getInitialProducts({
      ...productQueryOptions,
      pageSize: PAGE_SIZE,
    }),
  ]);

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

      <div className="mt-2">
        <CategoryGridClient
          slug={slug}
          title={current.name}
          description={seoContent?.introduction || current.description}
          total={totalForUI}
          initialProducts={initialProducts}
          pageSize={PAGE_SIZE}
          categoryDocIds={categoryDocIds}
          displayCurrency={CURRENT_STOREFRONT.defaultCurrency}
        />
      </div>

      <CategoryBuyingGuide slug={slug} />
    </main>
  );
}
