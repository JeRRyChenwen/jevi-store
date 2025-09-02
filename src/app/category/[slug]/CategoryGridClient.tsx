// src/app/category/[slug]/CategoryGridClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination/Pagination";

type Props = {
  slug: string;
  title: string;
  total: number;
  pageSize?: number; // 默认每页最多 40 条
};

export default function CategoryGridClient({
  slug,
  title,
  total,
  pageSize = 40,
}: Props) {
  const sp = useSearchParams();
  const pageParam = sp.get("page");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // 当前页（校正到 1..pageCount）
  const page = (() => {
    const n = Number(pageParam ?? "1");
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, pageCount);
  })();

  const start = (page - 1) * pageSize; // 0, 40, 80, ...
  const length = Math.min(pageSize, Math.max(0, total - start));

  // 当页列表（这里只是 demo，用占位数据）
  const list = useMemo(
    () =>
      Array.from({ length }).map((_, i) => ({
        id: `${slug}-${start + i + 1}`,
        index: start + i + 1, // 用于显示 Product #index
        price: 129,
      })),
    [slug, start, length]
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-neutral-600">
          Category: <code className="font-mono">{slug}</code>
        </p>
      </header>

      {list.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No products yet.
        </div>
      ) : (
        <section>
          {/* 固定 4 列（大屏） */}
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {list.map((p) => (
              <article
                key={p.id}
                className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-muted">
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    Image #{p.index}
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <h3 className="text-lg md:text-xl font-semibold">
                    Product #{p.index}
                  </h3>
                  <p className="mt-1 text-sm md:text-base text-muted-foreground line-clamp-2">
                    Short description goes here…
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xl md:text-2xl font-bold">${p.price}</span>
                    <button className="rounded-full px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base bg-primary text-primary-foreground transition-opacity hover:opacity-90">
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 页码根据 total / pageSize 自动生成 */}
      <Pagination
        page={page}
        pageCount={pageCount}
        hrefForPage={(p) => `/category/${slug}?page=${p}`}
        className="mb-10"
      />
    </>
  );
}
