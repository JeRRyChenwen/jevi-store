// src/app/(shop)/returns/_components/ReturnsOrdersTable.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserTime } from "@/components/datetime/Time";

import SortIcon from "./SortIcon";
import type { MyOrderRow, SortDir } from "../types";
import { fmtMoney } from "../utils";

type SortKey = "order" | "paidAt" | "amount";

type Props = {
  bootError: string;
  sortedMyOrders: MyOrderRow[];
  pagedOrders: MyOrderRow[];
  shouldLockListHeight: boolean;

  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (nextKey: SortKey) => void;

  loading: boolean;
  isLookupCoolingDown: boolean;
  handleFindOrder: (nextOrderNumber?: string, nextEmail?: string) => void;

  ordersTotal: number;
  showingFrom: number;
  showingTo: number;

  ordersPage: number;
  ordersTotalPages: number;
  bootLoading: boolean;
  goPage: (nextPage: number) => void;
};

export default function ReturnsOrdersTable({
  bootError,
  sortedMyOrders,
  pagedOrders,
  shouldLockListHeight,
  sortKey,
  sortDir,
  toggleSort,
  loading,
  isLookupCoolingDown,
  handleFindOrder,
  ordersTotal,
  showingFrom,
  showingTo,
  ordersPage,
  ordersTotalPages,
  bootLoading,
  goPage,
}: Props) {
  const headerBtn = "inline-flex items-center select-none hover:text-slate-900";

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">Your orders</div>
        <div className="text-xs text-muted-foreground">
          Select an order to start a return.
        </div>
      </div>

      {bootError && <div className="text-sm text-red-600">{bootError}</div>}

      {sortedMyOrders.length === 0 ? (
        <div className="text-sm text-muted-foreground">No orders found.</div>
      ) : (
        <div
          className={[
            "flex flex-col gap-3 transition-[min-height] duration-200",
            shouldLockListHeight ? "min-h-[590px]" : "h-auto min-h-[220px]",
          ].join(" ")}
        >
          {/* ✅ 最终规则：
              - 总订单数 <= 10（只有 1 页）时：自适应高度
              - 总订单数 > 10（进入“满页 + 后续页”场景）时：
                只保留一个较稳的最小高度，避免全屏时裁掉第 10 条，
                但不要强行把表格容器本身拉伸到占满剩余空间。 */}

          {/* ✅ 表格容器：始终按内容自然高度显示，避免底部出现大块空白 */}
          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="h-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b bg-slate-50 text-xs text-slate-600">
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
                        onClick={() => toggleSort("paidAt")}
                        title="Sort by Paid at"
                      >
                        Paid at
                        <SortIcon dir={sortKey === "paidAt" ? sortDir : null} />
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
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {pagedOrders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="py-2 pl-3 pr-4 font-medium">
                        {o.order_number || `#${o.id}`}
                        <div className="text-xs text-muted-foreground">
                          Items: {o.item_count}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {/* ✅ 用户侧：优先 epoch 秒 → 浏览器本地时间 */}
                        {typeof o.paid_at_ts === "number" ||
                        typeof o.created_at_ts === "number" ? (
                          <UserTime
                            ts={(o.paid_at_ts ?? o.created_at_ts) ?? null}
                            fallback="-"
                          />
                        ) : (
                          // ✅ 兜底：如果后端暂时没给 *_ts，就先显示旧的 cn 字符串（以后可以删）
                          o.paid_at_cn || o.created_at_cn || "-"
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {fmtMoney(o.total_minor, o.currency)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {o.status || "-"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Button
                          variant="outline"
                          className="px-4"
                          disabled={
                            loading || isLookupCoolingDown || !o.order_number || !o.email
                          }
                          onClick={() =>
                            handleFindOrder(
                              String(o.order_number || ""),
                              String(o.email || "")
                            )
                          }
                        >
                          {loading ? "Loading…" : "Start Return"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ 分页：永远贴底 */}
          <div className="mt-auto flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {ordersTotal > 0 ? (
                <>
                  Showing <span className="font-medium">{showingFrom}</span>
                  {"–"}
                  <span className="font-medium">{showingTo}</span> of{" "}
                  <span className="font-medium">{ordersTotal}</span>
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
                disabled={bootLoading || ordersPage <= 1}
                onClick={() => goPage(ordersPage - 1)}
                aria-label="Previous page"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                {(() => {
                  const totalPages = Math.max(1, Number(ordersTotalPages || 1));
                  const cur = Math.max(1, Math.min(ordersPage, totalPages));

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
                        disabled={bootLoading}
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
                disabled={bootLoading || ordersPage >= (ordersTotalPages || 1)}
                onClick={() => goPage(ordersPage + 1)}
                aria-label="Next page"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}