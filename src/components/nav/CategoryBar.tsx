// src/components/nav/CategoryBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/strapi";

/** 统一成 attributes 结构，便于复用之前的渲染代码 */
type Cat = {
  id?: number;
  documentId?: string;
  attributes: {
    name: string;
    slug: string;
    nav_order?: number | null;
  };
};

// 固定的 6 个顶级类目（静态）
const TOPS_FIXED: Cat[] = [
  { attributes: { name: "Shoes", slug: "shoes" } },
  { attributes: { name: "Bottoms", slug: "bottoms" } },
  { attributes: { name: "Tops", slug: "tops" } },
  { attributes: { name: "Suit", slug: "suit" } },
  { attributes: { name: "Accessories", slug: "accessories" } },
  { attributes: { name: "Outfit", slug: "outfit" } },
];

/** 将 v5 扁平 fields 结果映射到上面的 Cat 结构 */
function flatRowToCat(row: any): Cat {
  return {
    id: row?.id,
    documentId: row?.documentId,
    attributes: {
      name: row?.name ?? row?.attributes?.name ?? "",
      slug: row?.slug ?? row?.attributes?.slug ?? "",
      nav_order:
        row?.nav_order ?? row?.attributes?.nav_order ?? (null as number | null),
    },
  };
}

export default function CategoryBar() {
  const pathname = usePathname();

  // 顶级为固定值
  const tops = useMemo<Cat[]>(() => TOPS_FIXED, []);

  // 仅 Shoes 的子类目动态请求
  const [shoesDocId, setShoesDocId] = useState<string | null>(null);
  const [shoesChildren, setShoesChildren] = useState<Cat[]>([]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  /** 取 Shoes 的 documentId（通过 slug 查询） */
  useEffect(() => {
    const fetchShoesDocId = async () => {
      try {
        const q =
          `/api/categories?` +
          `filters[slug][$eq]=shoes&` +
          `fields[0]=documentId&fields[1]=slug&` +
          `publicationState=live`;
        const json = await api(q, { next: { revalidate: 0 } });
        const doc = json?.data?.[0]?.documentId as string | undefined;
        setShoesDocId(doc ?? null);
      } catch {
        setShoesDocId(null);
      }
    };
    fetchShoesDocId();
  }, []);

  /** 用 parent.documentId 拉取 Shoes 的子类目 */
  const fetchShoesChildren = async (docId: string) => {
    const q =
      `/api/categories?` +
      `filters[parent][documentId][$eq]=${encodeURIComponent(docId)}&` +
      `fields[0]=name&fields[1]=slug&fields[2]=documentId&fields[3]=nav_order&` +
      `sort[0]=nav_order:asc&sort[1]=name:asc&` +
      `pagination[pageSize]=200&publicationState=live`;
    const json = await api(q, { next: { revalidate: 0 } });
    const list: Cat[] = Array.isArray(json?.data)
      ? json.data.map(flatRowToCat)
      : [];
    // 再保险排序
    list.sort((a, b) => {
      const ao = a.attributes.nav_order ?? 9999;
      const bo = b.attributes.nav_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return (a.attributes.name || "").localeCompare(b.attributes.name || "");
    });
    setShoesChildren(list);
  };

  /** 悬停 Shoes 时按需加载一次子类目 */
  const ensureShoesChildren = async () => {
    if (!shoesDocId) return; // 还没拿到 docId
    if (shoesChildren.length > 0) return;
    try {
      await fetchShoesChildren(shoesDocId);
    } catch {
      // 忽略错误，保持空数组
    }
  };

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenSlug(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 路由变化时关闭
  useEffect(() => setOpenSlug(null), [pathname]);

  // 当前要展示的子类目：只有 shoes 有
  const currentSubs =
    openSlug === "shoes" && shoesChildren.length > 0 ? shoesChildren : [];

  return (
    <section
      className="relative w-full border-b bg-white text-neutral-900 shadow-sm"
      onMouseLeave={() => setOpenSlug(null)}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <nav
          aria-label="Shop categories"
          className="flex w-full items-center gap-2 md:gap-4 overflow-x-auto md:overflow-visible py-3 md:py-4 justify-start md:justify-center"
        >
          {tops.map((c) => {
            const slug = c.attributes.slug;
            const label = c.attributes.name || slug;
            const active =
              pathname === `/category/${slug}` ||
              (pathname?.startsWith(`/category/${slug}/`) ?? false);

            return (
              <div key={`${slug}`} className="relative">
                <Link
                  href={`/category/${slug}`}
                  onMouseEnter={() => {
                    setOpenSlug(slug);
                    if (slug === "shoes") ensureShoesChildren();
                  }}
                  className="inline-flex items-center gap-1 whitespace-nowrap px-2 md:px-3 py-2 text-sm md:text-[15px] font-medium border-b-2 border-transparent hover:border-neutral-400"
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* 只有 Shoes 且拉到子类目时，才展示 mega menu */}
      {openSlug === "shoes" && currentSubs.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 bg-white border-b shadow-lg hidden md:block">
          <div className="px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-6">
              {currentSubs.map((sub) => (
                <Link
                  key={`${sub.documentId || sub.id}-${sub.attributes.slug}`}
                  href={`/category/${sub.attributes.slug}`}
                  className="block rounded-xl p-4 hover:bg-neutral-50 transition"
                >
                  <div className="text-[15px] font-medium">
                    {sub.attributes.name || sub.attributes.slug}
                  </div>
                  <div className="text-xs opacity-60 mt-1">Shop now</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
