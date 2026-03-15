// src/app/(admin)/admin/(protected)/returns/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";

import type {
  ApiResponse,
  ApiReturnRow,
  SortBy,
  SortDir,
} from "./returns.types";
import { prettifyErrorMessage, safeReadJson } from "./returns.utils";
import ReturnsTable from "./_components/ReturnsTable";
import ReturnsPagination from "./_components/ReturnsPagination";

export default function AdminReturnsPage() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [rows, setRows] = useState<ApiReturnRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function fetchAllOnce() {
      setLoading(true);
      setError("");

      try {
        const all: ApiReturnRow[] = [];
        const serverPageSize = 100;
        let p = 1;

        while (true) {
          const sp = new URLSearchParams();
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

          const data = await safeReadJson<ApiResponse>(r);

          if (!r.ok || !data.ok) {
            throw new Error(data.error || `request_failed_${r.status}`);
          }

          const pageRows = Array.isArray(data.returns) ? data.returns : [];
          all.push(...pageRows);

          if (pageRows.length < serverPageSize) break;

          p += 1;
          if (p > 200) break;
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

  const filteredRows = useMemo(() => {
    const s = status.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => String(r.status || "").toLowerCase() === s);
  }, [rows, status]);

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

  const prettyError = useMemo(() => prettifyErrorMessage(error), [error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Returns</h2>
          <p className="mt-1 text-sm text-slate-600">
            一期先专注于退货审批 & 自动退款逻辑。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Status</label>
          <select
            className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
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

      {prettyError ? (
        <Alert variant="error" className="border p-3 text-sm">
          {prettyError}
        </Alert>
      ) : null}

      <div className="rounded-lg border bg-white">
        <ReturnsTable
          loading={loading}
          pagedRows={pagedRows}
          sortBy={sortBy}
          sortDir={sortDir}
          onToggleSort={toggleSort}
        />

        <ReturnsPagination
          total={total}
          page={page}
          pageCount={pageCount}
          loading={loading}
          onChangePage={setPage}
        />
      </div>
    </div>
  );
}