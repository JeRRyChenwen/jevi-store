// src/app/profile/EditOrdersCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// 如果你的项目没有 Badge / Skeleton，可以删掉这两行并把下面用到的组件换成 <span> / 占位 div
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type OrderRow = {
  id: number;
  order_number?: string | null;
  email: string;
  currency: string;
  total_minor: number;      // 后端返回的兼容字段（可能来自 grand_total_minor 或汇总）
  status: string | null;
  created_at: string;       // 你的 worker 用的是 'YYYY-MM-DD HH:mm:ss' 字符串
  item_count: number;       // 子查询汇总的件数
};

export default function EditOrdersCard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/my/orders", {
          method: "GET",
          credentials: "include", // 很关键：带上登录 cookie
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          setError(null);
        } else if (res.status === 401) {
          setOrders([]);
          setError("UNAUTHENTICATED");
        } else {
          setOrders([]);
          setError(data?.error || "Failed to load orders");
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(String(e?.message || e));
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 本地过滤（按订单号文本）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const label = (o.order_number ? `#${o.order_number}` : `#${o.id}`).toLowerCase();
      return label.includes(q);
    });
  }, [orders, query]);

  // 统一金额格式化
  const fmtMoney = (amountMinor: number, currency: string) => {
    const n = (amountMinor || 0) / 100;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "AUD" }).format(n);
    } catch {
      return `${(amountMinor / 100).toFixed(2)} ${currency || "AUD"}`;
    }
  };

  const StatusBadge = ({ status }: { status: string | null }) => {
    const s = (status || "paid").toLowerCase();
    // 简单的映射：按你的实际状态自由扩展
    const color =
      s === "paid" || s === "captured"
        ? "bg-emerald-100 text-emerald-700"
        : s === "pending"
        ? "bg-amber-100 text-amber-700"
        : s === "cancelled" || s === "refunded"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-700";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>{s}</span>;
  };

  // Loading skeleton（可选）
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Input disabled placeholder="Order Number (e.g. 1024)" />
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
          </div>
          <Button variant="outline" disabled size="sm">Search</Button>
        </div>
        <div className="border rounded divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="p-3 flex items-center justify-between" key={i}>
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 未登录 / 无订单
  if (error === "UNAUTHENTICATED") {
    return <p className="text-sm text-muted-foreground">Please sign in to view your orders.</p>;
  }

  const hasOrders = filtered.length > 0;

  return (
    <div className="space-y-3">
      {/* 搜索行 */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order Number (e.g. 1024)"
            className="pr-9"
          />
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear</Button>
      </div>

      {/* 列表或空状态 */}
      {!hasOrders ? (
        <p className="text-sm text-muted-foreground">You have placed no orders.</p>
      ) : (
        <ul className="divide-y border rounded">
          {filtered.map((o) => {
            const orderLabel = o.order_number ? `#${o.order_number}` : `#${o.id}`;
            return (
              <li key={`${o.id}-${o.order_number ?? "no"}`} className="p-3 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{orderLabel}</span>
                    {/* 如果你有 Badge 组件，替换上面的 span */}
                    {/* <Badge variant="secondary" className="text-xs">{orderLabel}</Badge> */}
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.created_at} · {o.item_count} item{o.item_count === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{fmtMoney(o.total_minor, (o.currency || "AUD").toUpperCase())}</div>
                  <Link
                    href={`/profile/orders/${o.id}`}
                    className="inline-flex items-center gap-1 text-xs underline mt-1"
                    title="View details"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 加载失败 */}
      {!!error && error !== "UNAUTHENTICATED" && (
        <p className="text-xs text-red-500">Failed to load orders: {error}</p>
      )}
    </div>
  );
}
