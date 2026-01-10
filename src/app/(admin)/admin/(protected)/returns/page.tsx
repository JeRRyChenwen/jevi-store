// src/app/admin/returns/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ApiReturnRow = {
  id: number;

  // d1-worker shapeReturnRow 里大概率是 snake_case
  return_number?: string | null;
  order_id?: number | null;
  order_number?: string | null;
  email?: string | null;
  status?: string | null;

  // 可能存在这些之一（你 worker 里返回的字段名取决于 shapeReturnRow）
  created_at_cn?: string | null;
  created_at?: string | null;
  created_at_ts?: number | null;
};

type ApiResponse = {
  ok: boolean;
  returns?: ApiReturnRow[];
  page?: number;
  page_size?: number;
  total?: number;
  error?: string;
};

function StatusPill({ value }: { value: string }) {
  const s = (value || "").toLowerCase();

  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",

    // 你后端 schema 里还有这些状态，顺便一起配好（可按你喜好调整）
    received: "bg-blue-100 text-blue-700",
    refunded: "bg-purple-100 text-purple-700",
    cancelled: "bg-slate-200 text-slate-600",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[s] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {s}
    </span>
  );
}

function formatCreatedAt(r: ApiReturnRow) {
  // 优先用你返回的北京时间字符串（最适合直接展示）
  if (r.created_at_cn) return r.created_at_cn;
  if (r.created_at) return r.created_at;

  // 兜底：如果只有 ts（秒），转本地时间展示
  if (typeof r.created_at_ts === "number" && Number.isFinite(r.created_at_ts)) {
    const d = new Date(r.created_at_ts * 1000);
    // 你可以换成更“澳洲运营”风格的格式
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
  return "—";
}

export default function AdminReturnsPage() {
  const [status, setStatus] = useState<string>(""); // "" = all
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<ApiReturnRow[]>([]);
  const [total, setTotal] = useState<number>(0);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (status.trim()) sp.set("status", status.trim());
    sp.set("page", String(page));
    sp.set("page_size", String(pageSize));
    return sp.toString();
  }, [status, page]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const r = await fetch(`/api/admin/returns?${query}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include", // ✅ 关键：带上 sp_admin cookie
          headers: { "content-type": "application/json" },
        });

        // ✅ 未登录：跳转到 admin 登录页（保留回跳）
        if (r.status === 401) {
          const next = `/admin/returns${query ? `?${query}` : ""}`;
          window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
          return;
        }

        const data = (await r.json()) as ApiResponse;

        if (!r.ok || !data.ok) {
          throw new Error(data.error || `request_failed_${r.status}`);
        }

        if (!alive) return;
        setRows(Array.isArray(data.returns) ? data.returns : []);
        setTotal(Number(data.total || 0));
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message || e));
        setRows([]);
        setTotal(0);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Returns</h2>
          <p className="mt-1 text-sm text-slate-600">
            一期先专注于退货审批 & 自动退款逻辑。
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Status</label>
          <select
            className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="refunded">refunded</option>
            <option value="failed">failed</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border bg-white p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">Return #</th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    No return requests.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const returnNo = r.return_number || `#${r.id}`;
                  const orderNo =
                    r.order_number ||
                    (r.order_id != null ? String(r.order_id) : "—");
                  const email = r.email || "—";
                  const st = (r.status || "—").toLowerCase();
                  const createdAt = formatCreatedAt(r);

                  return (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono">{returnNo}</td>
                      <td className="px-4 py-3 font-mono">{orderNo}</td>
                      <td className="px-4 py-3">{email}</td>
                      <td className="px-4 py-3">
                        <StatusPill value={st} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{createdAt}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          className="text-blue-600 hover:underline"
                          href={`/admin/returns/${r.id}`}
                        >
                          View / Approve
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-600">
          <div>
            Total: <span className="font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded border bg-white px-2 py-1 disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span>
              Page <span className="font-medium">{page}</span> / {pageCount}
            </span>
            <button
              className="rounded border bg-white px-2 py-1 disabled:opacity-50"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
