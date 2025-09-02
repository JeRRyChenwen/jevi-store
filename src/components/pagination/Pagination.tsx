// src/components/pagination/Pagination.tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;                        // 当前第几页（1-based）
  pageCount: number;                   // 总页数
  hrefForPage: (p: number) => string;  // 生成某页的链接，如 /category/new-in?page=3
  className?: string;
  windowSize?: number;                 // 中间数字页码最多展示多少个，默认 5
};

export default function Pagination({
  page,
  pageCount,
  hrefForPage,
  className,
  windowSize = 5,
}: Props) {
  if (pageCount <= 1) return null;

  const clampedPage = Math.min(Math.max(page, 1), pageCount);

  // 计算需要展示的数字页码窗口
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, clampedPage - half);
  let end = Math.min(pageCount, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }

  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  // 样式：白底按钮 / 当前页灰底 / 不可用
  const btnBase =
    "inline-flex h-9 min-w-[36px] items-center justify-center rounded-md border px-2 text-sm transition-colors";
  const btnWhite =
    "bg-white border-neutral-200 text-foreground hover:bg-neutral-50";
  const btnActive =
    "bg-neutral-200 border-neutral-300 text-foreground cursor-default";
  const btnDisabled =
    "bg-white border-neutral-200 text-neutral-300 cursor-not-allowed";

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-2 py-8", className)}
    >
      {/* 上一页 */}
      {clampedPage > 1 ? (
        <Link
          aria-label="Previous page"
          rel="prev"
          href={hrefForPage(clampedPage - 1)}
          className={cn(btnBase, btnWhite)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(btnBase, btnDisabled)} aria-hidden>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {/* 首页 + 左省略号 */}
      {start > 1 && (
        <>
          <Link href={hrefForPage(1)} className={cn(btnBase, btnWhite)}>
            1
          </Link>
          {start > 2 && (
            <span className="px-1 text-neutral-400 select-none">…</span>
          )}
        </>
      )}

      {/* 中间窗口页码 */}
      {pages.map((p) =>
        p === clampedPage ? (
          // 当前页：灰底且不可点击
          <span
            key={p}
            aria-current="page"
            className={cn(btnBase, btnActive)}
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefForPage(p)} className={cn(btnBase, btnWhite)}>
            {p}
          </Link>
        )
      )}

      {/* 右省略号 + 尾页 */}
      {end < pageCount && (
        <>
          {end < pageCount - 1 && (
            <span className="px-1 text-neutral-400 select-none">…</span>
          )}
          <Link
            href={hrefForPage(pageCount)}
            className={cn(btnBase, btnWhite)}
          >
            {pageCount}
          </Link>
        </>
      )}

      {/* 下一页 */}
      {clampedPage < pageCount ? (
        <Link
          aria-label="Next page"
          rel="next"
          href={hrefForPage(clampedPage + 1)}
          className={cn(btnBase, btnWhite)}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(btnBase, btnDisabled)} aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
