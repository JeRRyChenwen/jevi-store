// src/components/nav/CategoryBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTopLevelCategoryDocIdMap,
  fetchSubcategoriesByParentId,
  type CategoryLite,
} from "@/lib/strapi";

/** 统一成 attributes 结构，便于复用你原有的渲染代码 */
type Cat = {
  id?: number;
  documentId?: string;
  attributes: {
    name: string;
    slug: string;
    nav_order?: number | null;
  };
};

function liteToCat(row: CategoryLite): Cat {
  return {
    documentId: row.documentId,
    attributes: {
      name: row.name ?? "",
      slug: row.slug ?? "",
      nav_order: (row.nav_order ?? null) as number | null,
    },
  };
}

/** 固定的 6 个顶级类目（静态） */
const TOPS_FIXED: Cat[] = [
  { attributes: { name: "Shoes", slug: "shoes" } },
  { attributes: { name: "Bottoms", slug: "bottoms" } },
  { attributes: { name: "Tops", slug: "tops" } },
  { attributes: { name: "Suit", slug: "suit" } },
  { attributes: { name: "Accessories", slug: "accessories" } },
  { attributes: { name: "Outfit", slug: "outfit" } },
];

function sortCats(list: Cat[]) {
  list.sort((a, b) => {
    const ao = a.attributes.nav_order ?? 9999;
    const bo = b.attributes.nav_order ?? 9999;
    if (ao !== bo) return ao - bo;
    return (a.attributes.name || "").localeCompare(b.attributes.name || "");
  });
}

function SkeletonItem() {
  return (
    <div className="p-4 rounded-xl border animate-pulse">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="mt-2 h-3 w-16 rounded bg-muted" />
    </div>
  );
}

export default function CategoryBar() {
  const pathname = usePathname();

  const tops = useMemo<Cat[]>(() => TOPS_FIXED, []);

  // slug -> documentId
  const [docIdMap, setDocIdMap] = useState<Record<string, string> | null>(null);
  // 顶级分类子分类缓存：slug -> Cat[]
  const [childrenMap, setChildrenMap] = useState<Record<string, Cat[]>>({});
  // 当前打开的顶级分类
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  // 正在加载的顶级分类（显示骨架）
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  // 初始化映射
  useEffect(() => {
    let mounted = true;
    fetchTopLevelCategoryDocIdMap()
      .then((map) => mounted && setDocIdMap(map))
      .catch(() => setDocIdMap({})); // 忽略错误
    return () => {
      mounted = false;
    };
  }, []);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenSlug(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 路由变化时关闭
  useEffect(() => setOpenSlug(null), [pathname]);

  // 悬停时按需加载子分类；若无子分类则不展示下拉
  const ensureChildren = async (slug: string) => {
    // 映射还没好 -> 直接关闭
    if (!docIdMap) {
      setOpenSlug(null);
      return;
    }

    const parentId = docIdMap[slug];
    // 该顶级分类未在 Strapi 建好（无 parent=null 的记录）-> 关闭
    if (!parentId) {
      setOpenSlug(null);
      return;
    }

    // 已有缓存：根据长度决定开/关
    if (slug in childrenMap) {
      const list = childrenMap[slug];
      if (list && list.length > 0) {
        setOpenSlug(slug);
      } else {
        setOpenSlug(null); // ✅ 已知没有子类，确保关闭
      }
      return;
    }

    // 未缓存：先打开显示骨架；取回后再根据结果决定是否保留
    setLoadingSlug(slug);
    setOpenSlug(slug);
    try {
      const listLite = await fetchSubcategoriesByParentId(parentId);
      const list = listLite.map(liteToCat);
      sortCats(list);
      setChildrenMap((prev) => ({ ...prev, [slug]: list }));

      // 拉到 0 项 -> 立即关闭
      if (list.length === 0) {
        setOpenSlug((curr) => (curr === slug ? null : curr));
      }
    } catch {
      // 错误也当作无子类 -> 关闭
      setChildrenMap((prev) => ({ ...prev, [slug]: [] }));
      setOpenSlug((curr) => (curr === slug ? null : curr));
    } finally {
      setLoadingSlug((prev) => (prev === slug ? null : prev));
    }
  };

  const handleEnter = (slug: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    void ensureChildren(slug);
  };

  const handleLeaveAll = () => {
    closeTimer.current = window.setTimeout(() => setOpenSlug(null), 120);
  };

  const currentSubs = openSlug ? childrenMap[openSlug] ?? [] : [];
  const isLoading =
    openSlug ? loadingSlug === openSlug && currentSubs.length === 0 : false;

  return (
    <section
      className="relative w-full border-b bg-white text-neutral-900 shadow-sm"
      onMouseLeave={handleLeaveAll}
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
              <div key={slug} className="relative">
                <Link
                  href={`/category/${slug}`}
                  onMouseEnter={() => handleEnter(slug)}
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

      {/* 只有“加载中”或“有子分类”时才渲染下拉；没有子分类则完全不显示 */}
      {openSlug && (isLoading || currentSubs.length > 0) && (
        <div className="absolute inset-x-0 top-full z-50 bg-white border-b shadow-lg hidden md:block">
          <div className="px-4 md:px-6 lg:px-8">
            <div className="py-6">
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonItem key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
