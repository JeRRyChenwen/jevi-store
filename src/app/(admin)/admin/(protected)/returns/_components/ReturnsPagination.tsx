import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReturnsPaginationProps = {
  total: number;
  page: number;
  pageCount: number;
  loading: boolean;
  onChangePage: (page: number) => void;
};

export default function ReturnsPagination({
  total,
  page,
  pageCount,
  loading,
  onChangePage,
}: ReturnsPaginationProps) {
  const cur = Math.max(1, Math.min(page, pageCount));

  const pages: Array<number | "ellipsis"> = [];
  if (pageCount <= 5) {
    for (let i = 1; i <= pageCount; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, cur - 1);
    const end = Math.min(pageCount - 1, cur + 1);

    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < pageCount - 1) pages.push("ellipsis");

    pages.push(pageCount);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-xs text-slate-600">
        Total: <span className="font-medium">{total}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-9 px-0 rounded-lg"
          disabled={page <= 1 || loading}
          onClick={() => onChangePage(Math.max(1, page - 1))}
          aria-label="Previous page"
          title="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          {pages.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`e-${idx}`}
                  className="px-1 text-sm text-slate-500 select-none"
                >
                  …
                </span>
              );
            }

            const isActive = p === cur;
            const base = "h-9 w-9 px-0 rounded-lg border";
            const active =
              "bg-slate-100 border-slate-400 text-slate-900 pointer-events-none";
            const idle =
              "bg-white border-slate-200 text-slate-900 hover:bg-slate-50";

            return (
              <button
                key={p}
                type="button"
                className={[base, isActive ? active : idle].join(" ")}
                onClick={() => onChangePage(p)}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Page ${p}`}
                title={`Page ${p}`}
                disabled={loading}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-9 w-9 px-0 rounded-lg"
          disabled={page >= pageCount || loading}
          onClick={() => onChangePage(Math.min(pageCount, page + 1))}
          aria-label="Next page"
          title="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}