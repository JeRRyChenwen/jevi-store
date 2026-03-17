// src/components/nav/CategoryBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchNavTopCategories,
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

  // ✅ 顶级类目来自 Strapi（show_in_nav=true 的顶级分类）
  const [tops, setTops] = useState<Cat[]>([]);
  const [topsLoading, setTopsLoading] = useState(true);

  // ✅ slug -> documentId 由 tops 派生（不再单独 fetchTopLevelCategoryDocIdMap）
  const docIdMap = useMemo<Record<string, string> | null>(() => {
    if (!tops || tops.length === 0) return null;
    const map: Record<string, string> = {};
    for (const t of tops) {
      const slug = t.attributes.slug;
      const docId = t.documentId;
      if (slug && docId) map[String(slug)] = String(docId);
    }
    return map;
  }, [tops]);

  // 顶级分类子分类缓存：slug -> Cat[]
  const [childrenMap, setChildrenMap] = useState<Record<string, Cat[]>>({});
  // 当前打开的顶级分类
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  // 正在加载的顶级分类（显示骨架）
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  // ✅ 手机端横向分类滚动提示
  const scrollNavRef = useRef<HTMLElement | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // ✅ 初始化：拉取 Strapi 顶级导航分类
  useEffect(() => {
    let mounted = true;
    setTopsLoading(true);

    fetchNavTopCategories()
      .then((list) => {
        if (!mounted) return;
        const cats = list.map(liteToCat);
        sortCats(cats);
        setTops(cats);
      })
      .catch((e) => {
        console.error("[CategoryBar] fetchNavTopCategories failed:", e);
        if (mounted) setTops([]);
      })
      .finally(() => {
        if (mounted) setTopsLoading(false);
      });

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

  // ✅ 手机端：根据横向滚动位置决定是否显示左右 fade
  useEffect(() => {
    const el = scrollNavRef.current;
    if (!el) return;

    const updateFade = () => {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;

      // 没有可滚动内容：左右提示都不显示
      if (maxScrollLeft <= 2) {
        setShowLeftFade(false);
        setShowRightFade(false);
        return;
      }

      // 给一点容差，避免某些设备出现“明明到头了还残留 fade”
      const left = el.scrollLeft;
      const threshold = 6;

      setShowLeftFade(left > threshold);
      setShowRightFade(left < maxScrollLeft - threshold);
    };

    updateFade();

    el.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);

    return () => {
      el.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
    };
  }, [topsLoading, tops]);

  // 悬停时按需加载子分类；若无子分类则不展示下拉
  const ensureChildren = async (slug: string) => {
    // 映射还没好（或 tops 为空） -> 直接关闭
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
    } catch (e) {
      console.error("[CategoryBar] fetchSubcategoriesByParentId failed:", e);
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
    // 与 Navbar 同色、同宽，吸顶在 Navbar 下方（Navbar 高度：h-16 md:h-20）
    <section
      className="sticky top-14 md:top-20 z-40 w-full bg-white border-b border-neutral-200"
      onMouseLeave={handleLeaveAll}
    >
      <div className="mx-auto w-full max-w-[1400px] px-2 md:px-4">
        {/* ✅ 手机端横向滚动提示：右侧 fade 会在“还有内容可滑”时显示 */}
        <div className="relative">
          {/* 左侧 fade：仅手机端，且真的还能往左滑时才显示 */}
          {showLeftFade && (
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-white via-white/90 to-transparent md:hidden" />
          )}

          {/* 右侧 fade：仅手机端，且真的还能往右滑时才显示 */}
          {showRightFade && (
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-white via-white/95 to-transparent md:hidden" />
          )}

          <nav
            ref={scrollNavRef}
            aria-label="Shop categories"
            className="no-scrollbar -mx-2 flex w-full items-center gap-2 overflow-x-auto py-2 px-2 justify-start md:mx-0 md:justify-center md:gap-3 md:overflow-visible md:px-0 md:py-3"
          >
            {topsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-20 shrink-0 rounded-full bg-neutral-100 animate-pulse"
                />
              ))
            ) : tops.length === 0 ? (
              <div className="py-1 text-sm text-neutral-500">No categories</div>
            ) : (
              tops.map((c) => {
                const slug = c.attributes.slug;
                const label = c.attributes.name || slug;
                const active =
                  pathname === `/category/${slug}` ||
                  (pathname?.startsWith(`/category/${slug}/`) ?? false);

                return (
                  <div key={slug} className="relative shrink-0">
                    <Link
                      href={`/category/${slug}`}
                      onMouseEnter={() => handleEnter(slug)}
                      aria-current={active ? "page" : undefined}
                      aria-expanded={openSlug === slug}
                      className={[
                        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-black text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                      ].join(" ")}
                    >
                      {label}
                    </Link>
                  </div>
                );
              })
            )}
          </nav>
        </div>
      </div>

      {/* 只有“加载中”或“有子分类”时才渲染下拉；没有子分类则完全不显示（桌面端） */}
      {openSlug && (isLoading || currentSubs.length > 0) && (
        <div className="absolute inset-x-0 top-full z-50 bg-white border-b border-neutral-200 shadow-lg hidden md:block">
          <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
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
