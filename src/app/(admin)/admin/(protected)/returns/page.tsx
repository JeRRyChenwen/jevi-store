// src/app/(admin)/admin/(protected)/returns/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";

type ApiReturnRow = {
  id: number;

  return_number?: string | null;
  order_id?: number | null;
  order_number?: string | null;
  email?: string | null;
  status?: string | null;

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

type SortBy = "return_id" | "order_id" | "created_at";
type SortDir = "asc" | "desc";

function StatusPill({ value }: { value: string }) {
  const s = (value || "").toLowerCase();

  const styles: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
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
  if (r.created_at_cn) return r.created_at_cn;
  if (r.created_at) return r.created_at;

  if (typeof r.created_at_ts === "number" && Number.isFinite(r.created_at_ts)) {
    const d = new Date(r.created_at_ts * 1000);
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
  return "—";
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-slate-500">{dir === "asc" ? "↑" : "↓"}</span>;
}

/** 把偏“技术”的错误信息，转成用户可理解的提示 */
function prettifyErrorMessage(msg: string) {
  const s = (msg || "").trim();
  const lower = s.toLowerCase();

  if (!s) return "";

  // 你这里用的是：throw new Error(data.error || `request_failed_${r.status}`)
  // 所以常见会出现 request_failed_500 这种
  if (lower.startsWith("request_failed_")) {
    const code = lower.replace("request_failed_", "");
    return `Request failed (${code}). Please try again.`;
  }

  // 常见 error code（按你 worker 风格兜底）
  if (lower === "forbidden") return "Forbidden. Please sign in again.";
  if (lower === "unauthorized") return "Unauthorized. Please sign in again.";
  if (lower === "internal_error") return "Server error. Please try again later.";

  return s;
}

export default function AdminReturnsPage() {
  const [status, setStatus] = useState<string>(""); // "" = all
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ✅ 全量数据：一次性拉取所有 returns（所有 status）
  const [rows, setRows] = useState<ApiReturnRow[]>([]);

  // ✅ 只在首次加载时 loading；切换 status / 排序 / 翻页都不 loading
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // =========================
  // Fetch ALL rows (once)
  // =========================
  useEffect(() => {
    let alive = true;

    async function fetchAllOnce() {
      setLoading(true);
      setError("");

      try {
        const all: ApiReturnRow[] = [];

        // worker page_size 最大 100
        const serverPageSize = 100;
        let p = 1;

        while (true) {
          const sp = new URLSearchParams();
          // ✅ 关键：不传 status，拉全量
          sp.set("page", String(p));
          sp.set("page_size", String(serverPageSize));

          const r = await fetch(`/api/admin/returns?${sp.toString()}`, {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            headers: { "content-type": "application/json" },
          });

          if (r.status === 401) {
            const next = `/admin/returns`;
            window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
            return;
          }

          const data = (await r.json()) as ApiResponse;

          if (!r.ok || !data.ok) {
            throw new Error(data.error || `request_failed_${r.status}`);
          }

          const pageRows = Array.isArray(data.returns) ? data.returns : [];
          all.push(...pageRows);

          if (pageRows.length < serverPageSize) break;

          p += 1;
          if (p > 200) break; // safety
        }

        if (!alive) return;
        setRows(all);
        setPage(1);
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message || e));
        setRows([]);
        setPage(1);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    fetchAllOnce();
    return () => {
      alive = false;
    };
  }, []);

  // =========================
  // Local filter by status (no fetch)
  // =========================
  const filteredRows = useMemo(() => {
    const s = status.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => String(r.status || "").toLowerCase() === s);
  }, [rows, status]);

  // =========================
  // Local sort (no fetch)
  // =========================
  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];

    const getKeyNum = (r: ApiReturnRow) => {
      if (sortBy === "return_id") return Number(r.id || 0);
      if (sortBy === "order_id") return Number(r.order_id || 0);
      return Number(r.created_at_ts || 0);
    };

    copy.sort((a, b) => {
      const ka = getKeyNum(a);
      const kb = getKeyNum(b);

      if (ka === kb) {
        return Number(b.id) - Number(a.id);
      }

      return sortDir === "asc" ? ka - kb : kb - ka;
    });

    return copy;
  }, [filteredRows, sortBy, sortDir]);

  // =========================
  // Local pagination (no fetch)
  // =========================
  const total = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const pagedRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageCount]);

  function toggleSort(next: SortBy) {
    setPage(1);
    if (sortBy === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(next);
      setSortDir("desc");
    }
  }

  const headerBtn = "inline-flex items-center select-none hover:text-slate-900";

  const prettyError = useMemo(() => prettifyErrorMessage(error), [error]);

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
              setStatus(e.target.value);
              setPage(1); // ✅ 过滤变化回第一页（不触发 loading）
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

      {/* Unified Error */}
      {prettyError ? (
        <Alert variant="error" className="border p-3 text-sm">
          {prettyError}
        </Alert>
      ) : null}

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort("return_id")}
                    title="Sort by Return ID"
                  >
                    Return #
                    <SortIcon dir={sortBy === "return_id" ? sortDir : null} />
                  </button>
                </th>

                <th className="px-4 py-3">
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort("order_id")}
                    title="Sort by Order ID"
                  >
                    Order #
                    <SortIcon dir={sortBy === "order_id" ? sortDir : null} />
                  </button>
                </th>

                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3">
                  <button
                    type="button"
                    className={headerBtn}
                    onClick={() => toggleSort("created_at")}
                    title="Sort by Created At"
                  >
                    Created At
                    <SortIcon dir={sortBy === "created_at" ? sortDir : null} />
                  </button>
                </th>

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
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    No return requests.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => {
                  const returnNo = r.return_number || `#${r.id}`;
                  const orderNo =
                    r.order_number || (r.order_id != null ? String(r.order_id) : "—");
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
                        <Link className="text-blue-600 hover:underline" href={`/admin/returns/${r.id}`}>
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
              Page <span className="font-medium">{Math.min(page, pageCount)}</span> / {pageCount}
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
