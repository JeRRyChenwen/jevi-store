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

  // ✅ d1-worker 计算出来的“建议退款金额(分)” + 币种
  requested_amount_minor?: number | null;
  currency?: string | null;

  // ✅ 最简 approve/reject 需要的字段（后端可选返回）
  approved_amount_minor?: number | null;
  reject_reason?: string | null;
};

type ReturnItemRow = {
  id: number;
  return_id: number;
  order_item_id: number;
  qty: number;

  // ✅ d1-worker JOIN order_items 后新增的展示字段
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

// ✅ reason_type（后端 enum） -> UI label（前端展示）
const RETURN_REASON_LABELS: Record<string, string> = {
  changed_mind: "Changed my mind",
  wrong_item: "Received wrong item",
  faulty: "Faulty / damaged",
  other: "Other",
};

// ✅ 兜底：如果将来出现新 reason_type，至少能展示成可读的 Title Case
function titleCaseFromSnake(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getReasonLabel(reasonType: string | null) {
  if (!reasonType) return "-";
  return RETURN_REASON_LABELS[reasonType] ?? titleCaseFromSnake(reasonType);
}

export default function ReturnDetailClient({ id }: { id: string }) {
  const numericId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ApiPayload | null>(null);

  // 你原来就有的表单状态：先保留（方案 A 只是先把“详情页能查到数据”做通）
  const [rejectReason, setRejectReason] = useState<string>("");
  const [saving, setSaving] = useState<null | "approve" | "reject">(null);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
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

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [id, numericId]);

  const record = data?.return ?? null;
  const items = data?.items ?? [];

  // 你原来用 useMemo 来初始化 approveAmount；现在没有 paidAmountMinor 字段了，
  // 所以这里改为：如果为空，先默认 0.00（后续你接入真实退款金额字段再改）


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

  async function onApprove() {
    if (!record) return;

    setToast("");
    setSaving("approve");

    try {
      // ✅ 最简：直接 approve，不让你手输金额
      const r = await fetch(
        `/api/admin/returns/${encodeURIComponent(id)}/approve`,
        {
          method: "POST", // 若你 Next route 用 PATCH，这里改 PATCH
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            // 你想固定用建议金额：直接把建议金额传给后端（可选）
            approved_amount_minor: record.requested_amount_minor ?? null,
            currency: record.currency ?? null,
          }),
        }
      );

      const json = (await r.json().catch(() => null)) as any;

      if (!r.ok) {
        const code = json?.error || `HTTP_${r.status}`;
        throw new Error(code);
      }

      // ✅ 成功后刷新详情（拿到最新 status）
      setToast("Approved.");
      setRejectReason("");
      // 重新拉一次详情，确保 status / reject_reason 等是最新
      // 这里直接复用页面刷新：最简单粗暴
      window.location.reload();
    } catch (e: any) {
      setToast(`Approve failed: ${String(e?.message || e)}`);
    } finally {
      setSaving(null);
    }
  }

  async function onReject() {
  if (!record) return;

  // ✅ 校验必须在 setSaving 之前，否则会卡死在 Rejecting...
  const rr = rejectReason.trim();
  if (!rr) {
    setToast("Reject reason is required.");
    return;
  }

  setToast("");
  setSaving("reject");

  try {
    const r = await fetch(
      `/api/admin/returns/${encodeURIComponent(id)}/reject`,
      {
        method: "POST", // 如果你 Next API 用的是 PATCH，这里改成 PATCH
        headers: {
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          reject_reason: rr,
        }),
      }
    );

    const json = (await r.json().catch(() => null)) as any;

    if (!r.ok) {
      const code = json?.error || `HTTP_${r.status}`;
      throw new Error(code);
    }

    // ✅ 成功反馈
    setToast("Rejected.");
    setRejectReason("");

    // 最简单可靠：刷新页面拿最新 status
    window.location.reload();
  } catch (e: any) {
    setToast(`Reject failed: ${String(e?.message || e)}`);
  } finally {
    // ✅ 无论成功 / 失败 / throw，都会恢复按钮状态
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

              // 规格信息优先级：
              // 1) variant_title（通常已经包含 size/color）
              // 2) size + color（如果后端单独给）
              // 3) sku（如果有）
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
                  {/* Left: product info */}
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

                  {/* Right: qty */}
                  <div className="shrink-0 text-slate-700">
                    qty: <span className="font-mono">{it.qty}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions（先保留 mock；等你要做“真 approve/reject”我再帮你接 PATCH API） */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">Actions</div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {/* Left: Approve */}
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
            disabled={
              saving !== null ||
              (record.status || "").toLowerCase() !== "pending" ||
              typeof record.requested_amount_minor !== "number"
            }
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
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}
