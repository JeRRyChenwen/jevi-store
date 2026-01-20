// src/app/profile/EditOrdersCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";

type OrderRow = {
  id: number;
  order_number?: string | null;
  email: string | null;
  currency: string | null;
  total_minor: number; // worker 返回字段别名：total_minor
  status: string | null;

  // 时间字段（兼容多种返回）
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

function fmtDate(v: string | number | null | undefined) {
  if (v == null) return "";
  if (typeof v === "number") {
    const d = new Date(v * 1000);
    return d.toLocaleString();
  }
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(v)) {
    return v;
  }
  const d = new Date(v);
  return isNaN(+d) ? String(v) : d.toLocaleString();
}

function alertVariantOf(type?: string): "error" | "success" | "warning" | "info" {
  if (type === "success") return "success";
  if (type === "warning") return "warning";
  if (type === "info") return "info";
  return "error";
}

export default function EditOrdersCard() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 统一表单/页面级提示（替代 err state）
  const pageAlert = useFormAlert();

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

  // Local filter: 根据 order_number / id / status 模糊过滤
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

  return (
    <div className="px-4 pb-4">
      {/* Search row */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            // ✅ 用户操作时清掉旧提示（避免“黏住”）
            if (pageAlert.hasAlert) pageAlert.clear();
          }}
          placeholder="Filter by order number / ID / status"
          className="h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>

      {/* ✅ Alert */}
      {pageAlert.hasAlert && pageAlert.alert?.message ? (
        <div className="mb-3">
          <Alert variant={alertVariantOf(pageAlert.alert.type)}>
            {pageAlert.alert.message}
          </Alert>
        </div>
      ) : null}

      {/* Loading */}
      {loading && <div className="text-sm text-neutral-500">Loading orders…</div>}

      {/* Orders list (locally filtered) */}
      {!loading && orders && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2 pl-3 pr-4">Order / ID</th>
                <th className="py-2 pr-4">Created at</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Items</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="py-6 pl-3 pr-4 text-neutral-500" colSpan={5}>
                    No orders yet.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const key = o.order_number || String(o.id);
                  const href = `/profile/orders/${encodeURIComponent(key)}`;

                  return (
                    <tr key={o.id} className="border-t">
                      <td className="py-2 pl-3 pr-4">
                        <div className="flex flex-col">
                          <a
                            href={href}
                            className="font-medium text-black hover:underline"
                            title={`ID: ${o.id}`}
                          >
                            {o.order_number || `#${o.id}`}
                          </a>
                          <span className="text-xs text-neutral-500">View details</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {fmtDate(o.created_at_cn ?? o.created_at_ts ?? o.created_at)}
                      </td>
                      <td className="py-2 pr-4">
                        {fmtCurrency(o.total_minor, o.currency)}
                      </td>
                      <td className="py-2 pr-4">{o.status || "-"}</td>
                      <td className="py-2 pr-4">{o.item_count}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
