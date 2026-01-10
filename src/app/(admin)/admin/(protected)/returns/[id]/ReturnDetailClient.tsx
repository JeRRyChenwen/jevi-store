// src/app/admin/returns/[id]/ReturnDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  requested_amount_minor?: number | null;
  currency?: string | null;

  approved_amount_minor?: number | null;
  reject_reason?: string | null;

  approved_at_ts?: number | null;
  approved_by?: string | null;

  rejected_at_ts?: number | null;
  rejected_by?: string | null;
};

type ReturnItemRow = {
  id: number;
  return_id: number;
  order_item_id: number;
  qty: number;

  product_title?: string | null;
  variant_title?: string | null;
  size?: string | null;
  color?: string | null;
  variant_sku?: string | null;

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

const RETURN_REASON_LABELS: Record<string, string> = {
  changed_mind: "Changed my mind",
  wrong_item: "Received wrong item",
  faulty: "Faulty / damaged",
  other: "Other",
};

function titleCaseFromSnake(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getReasonLabel(reasonType: string | null) {
  if (!reasonType) return "-";
  return RETURN_REASON_LABELS[reasonType] ?? titleCaseFromSnake(reasonType);
}

function toLocalTime(tsSec?: number | null) {
  if (typeof tsSec !== "number") return "-";
  try {
    return new Date(tsSec * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

export default function ReturnDetailClient({ id }: { id: string }) {
  const numericId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ApiPayload | null>(null);

  const [rejectReason, setRejectReason] = useState<string>("");
  const [saving, setSaving] = useState<null | "approve" | "reject">(null);
  const [toast, setToast] = useState<string>("");

  async function loadDetail(signal?: AbortSignal) {
    const r = await fetch(`/api/admin/returns/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal,
    });

    if (r.status === 401) {
      // 未登录：交给 AdminAuthGate/middleware 处理跳转，或这里主动跳
      // router.replace(`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    if (!r.ok) {
      throw new Error(`Failed (${r.status})`);
    }

    const j = (await r.json().catch(() => null)) as ApiPayload | null;

    // ✅ 401：明确报未授权（通常应该被 AdminAuthGate 拦截，但这里也兜底）
    if (r.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!r.ok) {
      const code = j?.error || `HTTP_${r.status}`;
      throw new Error(code);
    }
    if (!j || !j.ok || !j.return) {
      throw new Error(j?.error || "BAD_PAYLOAD");
    }

    setData(j);
    return j;
  }

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    async function boot() {
      setLoading(true);
      setErr("");
      setData(null);

      if (!Number.isFinite(numericId)) {
        setLoading(false);
        setErr("INVALID_ID");
        return;
      }

      try {
        await loadDetail(ctrl.signal);
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [id, numericId]);

  const record = data?.return ?? null;
  const items = data?.items ?? [];

  const statusLower = String(record?.status || "").toLowerCase();
  const isPending = statusLower === "pending";
  const isApproved = statusLower === "approved";
  const isRejected = statusLower === "rejected";

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

  // ✅ 明确区分：id 不合法 / 真实 404 / 未授权 / 其他错误
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

        <h2 className="text-xl font-semibold">
          {pretty === "UNAUTHORIZED" ? "Admin login required" : "Return not found"}
        </h2>

        {pretty === "UNAUTHORIZED" ? (
          <p className="text-sm text-slate-600">
            You are not logged in as admin. Please sign in to continue.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            The return request you are looking for does not exist (id:{" "}
            <span className="font-mono">{id}</span>).
          </p>
        )}

        <div className="text-sm text-red-600">Error: {pretty}</div>

        {pretty === "UNAUTHORIZED" ? (
          <div className="pt-2">
            <Link
              href="/admin/login"
              className="inline-flex rounded-md bg-black px-3 py-2 text-sm text-white"
            >
              Go to Admin Login
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  async function onApprove() {
    if (!record) return;

    setToast("");
    setSaving("approve");

    try {
      const r = await fetch(`/api/admin/returns/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({
          // ✅ 你后端目前是 minimal version，不需要也不会坏
          approved_amount_minor: record.requested_amount_minor ?? null,
          currency: record.currency ?? null,
        }),
      });

      const j = (await r.json().catch(() => null)) as any;

      if (r.status === 401) throw new Error("UNAUTHORIZED");
      if (!r.ok) {
        const code = j?.error || `HTTP_${r.status}`;
        throw new Error(code);
      }

      setToast("Approved.");
      setRejectReason("");
      await loadDetail();
    } catch (e: any) {
      const msg = String(e?.message || e);
      setToast(msg === "UNAUTHORIZED" ? "Session expired. Please login again." : `Approve failed: ${msg}`);
    } finally {
      setSaving(null);
    }
  }

  async function onReject() {
    if (!record) return;

    const rr = rejectReason.trim();
    if (!rr) {
      setToast("Reject reason is required.");
      return;
    }

    setToast("");
    setSaving("reject");

    try {
      const r = await fetch(`/api/admin/returns/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ reject_reason: rr }),
      });

      const j = (await r.json().catch(() => null)) as any;

      if (r.status === 401) throw new Error("UNAUTHORIZED");
      if (!r.ok) {
        const code = j?.error || `HTTP_${r.status}`;
        throw new Error(code);
      }

      setToast("Rejected.");
      setRejectReason("");
      await loadDetail();
    } catch (e: any) {
      const msg = String(e?.message || e);
      setToast(msg === "UNAUTHORIZED" ? "Session expired. Please login again." : `Reject failed: ${msg}`);
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
          <div className="mt-1 text-sm text-slate-600">
            Updated: <span className="font-mono">{record.updated_at_cn || "-"}</span>
          </div>
        </div>

        <div className="shrink-0">
          <StatusPill value={record.status || "unknown"} />
        </div>
      </div>

      {!isPending ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-900">Final decision</div>

          {isApproved ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Status:</span>{" "}
                <span className="font-medium text-green-700">Approved</span>
              </div>
              <div>
                <span className="text-slate-500">By:</span>{" "}
                <span className="font-mono">{record.approved_by || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500">At:</span>{" "}
                <span className="font-mono">
                  {record.approved_at_ts ? toLocalTime(record.approved_at_ts) : "-"}
                </span>
              </div>
            </div>
          ) : null}

          {isRejected ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Status:</span>{" "}
                <span className="font-medium text-red-700">Rejected</span>
              </div>
              <div>
                <span className="text-slate-500">By:</span>{" "}
                <span className="font-mono">{record.rejected_by || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500">At:</span>{" "}
                <span className="font-mono">
                  {record.rejected_at_ts ? toLocalTime(record.rejected_at_ts) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Reason:</span>{" "}
                <span className="font-mono">{record.reject_reason || "-"}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Reason</div>
        <div className="mt-2 text-sm text-slate-700">
          <div>
            <span className="text-slate-500">Type:</span>{" "}
            <span className="font-mono">{getReasonLabel(record.reason_type)}</span>
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
            {items.map((it) => {
              const title = it.product_title || `Item #${it.order_item_id}`;

              const parts: string[] = [];
              if (it.variant_title) parts.push(it.variant_title);
              else {
                if (it.size) parts.push(`Size: ${it.size}`);
                if (it.color) parts.push(`Color: ${it.color}`);
              }
              if (it.variant_sku) parts.push(`SKU: ${it.variant_sku}`);

              const meta = parts.filter(Boolean).join(" · ");

              return (
                <div
                  key={it.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">{title}</div>
                    {meta ? (
                      <div className="mt-0.5 text-xs text-slate-500">{meta}</div>
                    ) : (
                      <div className="mt-0.5 text-xs text-slate-500">
                        order_item_id: <span className="font-mono">{it.order_item_id}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-slate-700">
                    qty: <span className="font-mono">{it.qty}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isPending ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-medium text-slate-900">Actions</div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                Approve amount {record.currency ? `(${record.currency})` : ""}
              </div>

              <div className="text-sm font-semibold text-slate-900">
                {typeof record.requested_amount_minor === "number"
                  ? `${(record.requested_amount_minor / 100).toFixed(2)}${
                      record.currency ? ` ${record.currency}` : ""
                    }`
                  : "N/A"}
              </div>

              <button
                onClick={onApprove}
                disabled={saving !== null || typeof record.requested_amount_minor !== "number"}
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
                onClick={onReject}
                disabled={saving !== null}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
              >
                {saving === "reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>

          {toast ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {toast === "Session expired. Please login again." ? (
                <div className="flex items-center justify-between gap-3">
                  <span>{toast}</span>
                  <Link
                    href="/admin/login"
                    className="shrink-0 rounded-md bg-black px-3 py-2 text-sm text-white"
                  >
                    Login
                  </Link>
                </div>
              ) : (
                toast
              )}
            </div>
          ) : null}
        </div>
      ) : toast ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
