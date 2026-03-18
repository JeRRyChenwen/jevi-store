"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserTime } from "@/components/datetime/Time";
import SortIcon from "./SortIcon";
import type { MyOrderRow, SortDir } from "../types";
import { fmtMoney } from "../utils";

type SortKey = "order" | "paidAt" | "amount";

type ReturnsLookupStepProps = {
  bootLoading: boolean;
  authed: boolean;
  bootError: string;

  sortedMyOrdersLength: number;
  pagedOrders: MyOrderRow[];

  shouldLockListHeight: boolean;
  ordersTotal: number;
  showingFrom: number;
  showingTo: number;
  ordersPage: number;
  ordersTotalPages: number;

  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (nextKey: SortKey) => void;

  orderNumber: string;
  email: string;
  onOrderNumberChange: (value: string) => void;
  onEmailChange: (value: string) => void;

  loading: boolean;
  isLookupCoolingDown: boolean;

  onGoPage: (nextPage: number) => void;
  onFindOrder: (nextOrderNumber?: string, nextEmail?: string) => void;
};

function statusBadgeClass(status?: string | null) {
  const s = String(status || "").trim().toLowerCase();

  if (["paid", "completed", "delivered", "fulfilled", "success"].includes(s)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (["pending", "processing", "in progress"].includes(s)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["cancelled", "canceled", "failed", "refunded", "rejected"].includes(s)) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function ReturnsLookupStep({
  bootLoading,
  authed,
  bootError,
  sortedMyOrdersLength,
  pagedOrders,
  shouldLockListHeight,
  ordersTotal,
  showingFrom,
  showingTo,
  ordersPage,
  ordersTotalPages,
  sortKey,
  sortDir,
  onToggleSort,
  orderNumber,
  email,
  onOrderNumberChange,
  onEmailChange,
  loading,
  isLookupCoolingDown,
  onGoPage,
  onFindOrder,
}: ReturnsLookupStepProps) {
  const headerBtn = "inline-flex items-center select-none hover:text-slate-900";

  return (
    <div className="space-y-4">
      {bootLoading ? (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Loading your orders…</div>
        </Card>
      ) : authed ? (
        <Card className="p-4 space-y-6">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Your orders</div>
              <div className="text-xs text-muted-foreground">
                Select an order to start a return.
              </div>
            </div>

            {bootError && <div className="text-sm text-red-600">{bootError}</div>}

            {sortedMyOrdersLength === 0 ? (
              <div className="text-sm text-muted-foreground">No orders found.</div>
            ) : (
              <div
                className={[
                  "flex flex-col gap-3 transition-[min-height] duration-200",
                  shouldLockListHeight
                    ? "min-h-[590px]"
                    : "h-auto min-h-[220px]",
                ].join(" ")}
              >
                <div className="overflow-hidden rounded-lg border bg-white">
                  {/* =========================
                      Desktop: keep existing table
                    ========================= */}
                  <div className="hidden md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 border-b bg-slate-50 text-xs text-slate-600">
                        <tr>
                          <th className="py-2 pl-3 pr-4">
                            <button
                              type="button"
                              className={headerBtn}
                              onClick={() => onToggleSort("order")}
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
                              onClick={() => onToggleSort("paidAt")}
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
                              onClick={() => onToggleSort("amount")}
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
                              {typeof o.paid_at_ts === "number" ||
                              typeof o.created_at_ts === "number" ? (
                                <UserTime
                                  ts={(o.paid_at_ts ?? o.created_at_ts) ?? null}
                                  fallback="-"
                                />
                              ) : (
                                o.paid_at_cn || o.created_at_cn || "-"
                              )}
                            </td>
                            <td className="py-2 pr-4">{fmtMoney(o.total_minor, o.currency)}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{o.status || "-"}</td>
                            <td className="py-2 pr-3 text-right">
                              <Button
                                variant="outline"
                                className="px-4"
                                disabled={
                                  loading ||
                                  isLookupCoolingDown ||
                                  !o.order_number ||
                                  !o.email
                                }
                                onClick={() =>
                                  onFindOrder(
                                    String(o.order_number || ""),
                                    String(o.email || "")
                                  )
                                }
                              >
                                Start Return
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* =========================
                      Mobile: card list
                    ========================= */}
                  <div className="md:hidden">
                    {pagedOrders.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-neutral-500">No orders found.</div>
                    ) : (
                      <div className="divide-y">
                        {pagedOrders.map((o) => (
                          <div key={o.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Order
                                </div>
                                <div className="mt-1 break-words text-base font-semibold text-slate-900">
                                  {o.order_number || `#${o.id}`}
                                </div>
                              </div>

                              <span
                                className={[
                                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                                  statusBadgeClass(o.status),
                                ].join(" ")}
                              >
                                {o.status || "-"}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                  Paid at
                                </div>
                                <div className="mt-1 text-sm text-slate-900">
                                  {typeof o.paid_at_ts === "number" ||
                                  typeof o.created_at_ts === "number" ? (
                                    <UserTime
                                      ts={(o.paid_at_ts ?? o.created_at_ts) ?? null}
                                      fallback="-"
                                    />
                                  ) : (
                                    o.paid_at_cn || o.created_at_cn || "-"
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                  Amount
                                </div>
                                <div className="mt-1 text-sm font-medium text-slate-900">
                                  {fmtMoney(o.total_minor, o.currency)}
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                  Items
                                </div>
                                <div className="mt-1 text-sm text-slate-900">{o.item_count}</div>
                              </div>

                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                  Order ID
                                </div>
                                <div className="mt-1 text-sm text-slate-900">#{o.id}</div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <Button
                                variant="outline"
                                className="h-10 w-full rounded-lg"
                                disabled={
                                  loading ||
                                  isLookupCoolingDown ||
                                  !o.order_number ||
                                  !o.email
                                }
                                onClick={() =>
                                  onFindOrder(
                                    String(o.order_number || ""),
                                    String(o.email || "")
                                  )
                                }
                              >
                                Start Return
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
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

                  <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 px-0 rounded-lg"
                      disabled={bootLoading || ordersPage <= 1}
                      onClick={() => onGoPage(ordersPage - 1)}
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
                              onClick={() => onGoPage(p)}
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
                      onClick={() => onGoPage(ordersPage + 1)}
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

          <div className="border-t pt-6 space-y-4">
            <div>
              <div className="text-sm font-medium">Find an order by order number and email</div>
              <div className="text-xs text-muted-foreground">
                Use this if you want to start a return for a different email/order.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Order number</label>
              <Input
                value={orderNumber}
                onChange={(e) => onOrderNumberChange(e.target.value)}
                placeholder="e.g. SP20251201-000123"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email used for this order</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="e.g. name@example.com"
              />
            </div>

            <Button
              variant="outline"
              className="px-6"
              onClick={() => onFindOrder()}
              disabled={loading || isLookupCoolingDown}
            >
              {loading ? "Finding your order..." : "Find my order"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Please enter your order number and email to start a return.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Order number</label>
            <Input
              value={orderNumber}
              onChange={(e) => onOrderNumberChange(e.target.value)}
              placeholder="e.g. SP20251201-000123"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email used for this order</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            className="px-6"
            onClick={() => onFindOrder()}
            disabled={loading || isLookupCoolingDown}
          >
            {loading ? "Finding your order..." : "Find my order"}
          </Button>
        </Card>
      )}
    </div>
  );
}