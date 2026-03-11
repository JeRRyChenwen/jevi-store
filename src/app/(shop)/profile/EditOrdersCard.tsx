// src/app/profile/EditOrdersCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useFormAlert } from "@/hooks/useFormAlert";
import { UserTime } from "@/components/datetime/Time";

type OrderRow = {
  id: number;
  order_number?: string | null;
  email: string | null;
  currency: string | null;
  total_minor: number;
  status: string | null;

  created_at: string | number | null;
  created_at_cn?: string | null;
  created_at_ts?: number | null;

  item_count: number;
};

type MyOrdersResp = {
  ok: boolean;
  email: string | null;
  orders: OrderRow[];
  worker_version?: string;
};

function fmtCurrency(minor: number, ccy: string | null) {
  const code = (ccy || "AUD").toUpperCase();
  const major = (minor || 0) / 100;
  const num = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${code} ${num}`;
}

function alertVariantOf(type?: string): "error" | "success" | "warning" | "info" {
  if (type === "success") return "success";
  if (type === "warning") return "warning";
  if (type === "info") return "info";
  return "error";
}

/** ✅ 与 returns 页面一致：用于排序 order number */
function cmpText(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** ✅ 与 returns / admin 一致的排序 icon（文本 ↕ / ↑ / ↓） */
type SortDir = "asc" | "desc";
function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-slate-500">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function EditOrdersCard() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ NEW: pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  function goPage(nextPage: number) {
    setPage(() => {
      const n = Math.floor(nextPage || 1);
      return Math.max(1, Math.min(totalPages, n));
    });
  }

  // ✅ 统一提示
  const pageAlert = useFormAlert();

  // ✅ NEW：与 returns 页面统一的表头排序
  type SortKey = "order" | "createdAt" | "amount";
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // 默认：Created at 新到旧
  const headerBtn = "inline-flex items-center select-none hover:text-slate-900";

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("desc");
    }
  }

  // Load "My orders" on mount
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        pageAlert.clear();

        const r = await fetch("/api/my/orders", {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" },
          cache: "no-store",
        });

        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`/api/my/orders ${r.status}: ${t}`);
        }

        const data = (await r.json()) as MyOrdersResp;
        if (!dead) setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (e: any) {
        if (!dead) pageAlert.error(e?.message || String(e));
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local filter
  const filtered = useMemo(() => {
    if (!orders) return [];
    const s = q.trim().toLowerCase();
    if (!s) return orders;

    return orders.filter((o) => {
      const num = (o.order_number || "").toLowerCase();
      const id = String(o.id);
      const st = (o.status || "").toLowerCase();
      return num.includes(s) || id.includes(s) || st.includes(s);
    });
  }, [orders, q]);

  // ✅ NEW：在 filter 之后做排序（与 returns 页面一致）
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortKey === "amount") {
        const av = Number(a.total_minor || 0);
        const bv = Number(b.total_minor || 0);
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      }

      if (sortKey === "createdAt") {
        const at =
          typeof a.created_at_ts === "number" ? a.created_at_ts * 1000 : 0;
        const bt =
          typeof b.created_at_ts === "number" ? b.created_at_ts * 1000 : 0;

        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }

      // sortKey === "order"
      const ao = String(a.order_number || `#${a.id}`);
      const bo = String(b.order_number || `#${b.id}`);
      const c = cmpText(ao, bo);
      if (c === 0) return 0;
      return c > 0 ? dir : -dir;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  // ✅ NEW: reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [q]);

  // ✅ NEW: derive pagination
  const total = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ✅ NEW: clamp current page if totalPages changes
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return sortedFiltered.slice(start, end);
  }, [sortedFiltered, page]);

  // ✅ 最终规则：
  // - 总订单数 <= 10（只有 1 页）时：自适应高度
  // - 总订单数 > 10（进入“满页 + 后续页”场景）时：
  //   从第一页开始把整个列表高度锁定，后续所有页保持一致
  const shouldLockListHeight = total > PAGE_SIZE;

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 pb-4">
      {/* Search row */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (pageAlert.hasAlert) pageAlert.clear();
          }}
          placeholder="Filter by order number / ID / status"
          className="h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>

      {/* Alert */}
      {pageAlert.hasAlert && pageAlert.alert?.message ? (
        <div className="mb-3">
          <Alert variant={alertVariantOf(pageAlert.alert.type)}>
            {pageAlert.alert.message}
          </Alert>
        </div>
      ) : null}

      {/* Loading */}
      {loading && <div className="text-sm text-neutral-500">Loading orders…</div>}

      {/* Orders list */}
      {!loading && orders && (
        <div className="space-y-3">
          {/* ✅ 最终规则：
              - 总订单数 <= 10（只有 1 页）时：自适应高度
              - 总订单数 > 10（进入“满页 + 后续页”场景）时：
                从第一页开始把整个列表高度锁定，后续所有页保持一致 */}
          <div
            className={[
              "flex flex-col gap-3 transition-[min-height] duration-200",
              shouldLockListHeight
                ? "min-h-[590px]"
                : "min-h-[220px]",
            ].join(" ")}
          >
            {/* ✅ 表格盒子：锁定高度时占满剩余空间；否则自然收缩 */}
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="py-2 pl-3 pr-4">
                        <button
                          type="button"
                          className={headerBtn}
                          onClick={() => toggleSort("order")}
                          title="Sort by Order"
                        >
                          Order number
                          <SortIcon dir={sortKey === "order" ? sortDir : null} />
                        </button>
                      </th>

                      <th className="py-2 pr-4">
                        <button
                          type="button"
                          className={headerBtn}
                          onClick={() => toggleSort("createdAt")}
                          title="Sort by Created at"
                        >
                          Created at
                          <SortIcon dir={sortKey === "createdAt" ? sortDir : null} />
                        </button>
                      </th>

                      <th className="py-2 pr-4">
                        <button
                          type="button"
                          className={headerBtn}
                          onClick={() => toggleSort("amount")}
                          title="Sort by Amount"
                        >
                          Amount
                          <SortIcon dir={sortKey === "amount" ? sortDir : null} />
                        </button>
                      </th>

                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Items</th>
                      <th className="py-2 pr-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagedOrders.length === 0 ? (
                      <tr>
                        <td className="py-6 pl-3 pr-4 text-neutral-500" colSpan={6}>
                          No orders yet.
                        </td>
                      </tr>
                    ) : (
                      pagedOrders.map((o) => {
                        const key = o.order_number || String(o.id);
                        const href = `/profile/orders/${encodeURIComponent(key)}`;

                        return (
                          <tr key={o.id} className="border-t">
                            {/* ✅ Order number now plain text */}
                            <td className="py-2 pl-3 pr-4">
                              <span className="font-medium text-black">
                                {o.order_number || `#${o.id}`}
                              </span>
                            </td>

                            <td className="py-2 pr-4">
                              <UserTime ts={o.created_at_ts ?? null} fallback="-" />
                            </td>
                            <td className="py-2 pr-4">
                              {fmtCurrency(o.total_minor, o.currency)}
                            </td>
                            <td className="py-2 pr-4">{o.status || "-"}</td>
                            <td className="py-2 pr-4">{o.item_count}</td>

                            {/* ✅ New action button */}
                            <td className="py-2 pr-3 text-right">
                              <Button
                                variant="outline"
                                className="h-9 rounded-lg"
                                onClick={() => router.push(href)}
                              >
                                View details
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ✅ 只有进入“超过 10 条”的多页场景后，才用空白块撑满剩余高度 */}
              {shouldLockListHeight ? <div className="flex-1 bg-white" /> : null}
            </div>

            {/* ✅ summary 始终显示；右侧始终显示统一分页控件（即使只有 1 页） */}
            <div className="mt-auto flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {total > 0 ? (
                  <>
                    Showing <span className="font-medium">{showingFrom}</span>
                    {"–"}
                    <span className="font-medium">{showingTo}</span> of{" "}
                    <span className="font-medium">{total}</span>
                  </>
                ) : (
                  <>Showing 0</>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 px-0 rounded-lg"
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                  aria-label="Previous page"
                  title="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  {(() => {
                    const cur = Math.max(1, Math.min(page, totalPages));
                    const pages: Array<number | "ellipsis"> = [];

                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      const start = Math.max(2, cur - 1);
                      const end = Math.min(totalPages - 1, cur + 1);

                      if (start > 2) pages.push("ellipsis");
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < totalPages - 1) pages.push("ellipsis");

                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) => {
                      if (p === "ellipsis") {
                        return (
                          <span
                            key={`e-${idx}`}
                            className="px-1 text-sm text-muted-foreground select-none"
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
                          onClick={() => goPage(p)}
                          aria-current={isActive ? "page" : undefined}
                          aria-label={`Page ${p}`}
                          title={`Page ${p}`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 px-0 rounded-lg"
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                  aria-label="Next page"
                  title="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}