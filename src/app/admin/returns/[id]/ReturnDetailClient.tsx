// src/app/admin/returns/[id]/ReturnDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReturnRow = {
  id: number;
  return_number: string | null;
  order_id: number | null;
  order_number: string | null;
  email: string | null;
  status: string | null;

  reason_type: string | null;
  reason_detail: string | null;

  created_at_cn: string | null;
  updated_at_cn: string | null;

  created_at_ts?: number | null;
  updated_at_ts?: number | null;
};

type ReturnItemRow = {
  id: number;
  return_id: number;
  order_item_id: number;
  qty: number;
  created_at_cn?: string | null;
  created_at_ts?: number | null;
};

type ApiPayload = {
  ok: boolean;
  return?: ReturnRow;
  items?: ReturnItemRow[];
  error?: string;
  worker_version?: string;
};

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">
      {value}
    </span>
  );
}

export default function ReturnDetailClient({ id }: { id: string }) {
  const numericId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ApiPayload | null>(null);

  // 你原来就有的表单状态：先保留（方案 A 只是先把“详情页能查到数据”做通）
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [saving, setSaving] = useState<null | "approve" | "reject">(null);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      setData(null);

      if (!Number.isFinite(numericId)) {
        setLoading(false);
        setErr("INVALID_ID");
        return;
      }

      try {
        const r = await fetch(`/api/admin/returns/${encodeURIComponent(id)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = (await r.json().catch(() => null)) as ApiPayload | null;

        if (!r.ok) {
          const code = json?.error || `HTTP_${r.status}`;
          throw new Error(code);
        }
        if (!json || !json.ok || !json.return) {
          throw new Error(json?.error || "BAD_PAYLOAD");
        }

        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id, numericId]);

  const record = data?.return ?? null;
  const items = data?.items ?? [];

  // 你原来用 useMemo 来初始化 approveAmount；现在没有 paidAmountMinor 字段了，
  // 所以这里改为：如果为空，先默认 0.00（后续你接入真实退款金额字段再改）
  useMemo(() => {
    if (!record) return;
    if (approveAmount.trim() === "") setApproveAmount("0.00");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-slate-500">
          <Link href="/admin/returns" className="hover:underline">
            ← Back to Returns
          </Link>
        </div>
        <h2 className="text-xl font-semibold">Loading...</h2>
        <p className="text-sm text-slate-600">Fetching return #{id}</p>
      </div>
    );
  }

  // 明确区分：id 不合法 / 真实 404 / 未授权 / 其他错误
  if (!record) {
    const pretty =
      err === "not_found" || err === "HTTP_404"
        ? "NOT_FOUND"
        : err === "UNAUTHORIZED" || err === "HTTP_401"
          ? "UNAUTHORIZED"
          : err || "UNKNOWN_ERROR";

    return (
      <div className="space-y-3">
        <div className="text-sm text-slate-500">
          <Link href="/admin/returns" className="hover:underline">
            ← Back to Returns
          </Link>
        </div>

        <h2 className="text-xl font-semibold">Return not found</h2>
        <p className="text-sm text-slate-600">
          The return request you are looking for does not exist (id:{" "}
          <span className="font-mono">{id}</span>).
        </p>

        <div className="text-sm text-red-600">Error: {pretty}</div>
      </div>
    );
  }

  async function onApproveMock() {
    setToast("");
    setSaving("approve");
    try {
      await new Promise((r) => setTimeout(r, 600));
      setToast(`Mock: Approved. (amount=${approveAmount})`);
    } catch (e: any) {
      setToast(`Mock: Approve failed: ${String(e?.message || e)}`);
    } finally {
      setSaving(null);
    }
  }

  async function onRejectMock() {
    setToast("");
    setSaving("reject");
    try {
      await new Promise((r) => setTimeout(r, 600));
      setToast(`Mock: Rejected. (reason=${rejectReason || "N/A"})`);
    } catch (e: any) {
      setToast(`Mock: Reject failed: ${String(e?.message || e)}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-500">
        <Link href="/admin/returns" className="hover:underline">
          ← Back to Returns
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Return {record.return_number || `#${record.id}`}
          </h2>
          <div className="mt-1 text-sm text-slate-600">
            Order:{" "}
            <span className="font-mono">
              {record.order_number || record.order_id || "-"}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Email: <span className="font-mono">{record.email || "-"}</span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Created: <span className="font-mono">{record.created_at_cn || "-"}</span>
          </div>
        </div>

        <div className="shrink-0">
          <StatusPill value={record.status || "unknown"} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Reason</div>
        <div className="mt-2 text-sm text-slate-700">
          <div>
            <span className="text-slate-500">Type:</span>{" "}
            <span className="font-mono">{record.reason_type || "-"}</span>
          </div>
          <div className="mt-1">
            <span className="text-slate-500">Detail:</span>{" "}
            <span className="font-mono">{record.reason_detail || "-"}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Items</div>
        {items.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">No items.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="text-slate-700">
                  order_item_id: <span className="font-mono">{it.order_item_id}</span>
                </div>
                <div className="text-slate-700">
                  qty: <span className="font-mono">{it.qty}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions（先保留 mock；等你要做“真 approve/reject”我再帮你接 PATCH API） */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Actions</div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm text-slate-600">Approve amount</div>
            <input
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="0.00"
            />
            <button
              onClick={onApproveMock}
              disabled={saving !== null}
              className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving === "approve" ? "Approving..." : "Approve"}
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-slate-600">Reject reason</div>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Reason..."
            />
            <button
              onClick={onRejectMock}
              disabled={saving !== null}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
            >
              {saving === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>

        {toast ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}
