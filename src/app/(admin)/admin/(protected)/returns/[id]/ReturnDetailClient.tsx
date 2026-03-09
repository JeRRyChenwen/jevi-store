// src/app/(admin)/admin/(protected)/returns/[id]/ReturnDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BackButton from "@/components/navigation/BackButton";
import { Alert } from "@/components/ui/alert";

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

  // ✅ 金额拆分
  items_amount_minor?: number | null;
  delivery_fee_minor?: number | null;
  requested_amount_minor?: number | null;
  currency?: string | null;

  approved_amount_minor?: number | null;
  refunded_amount_minor?: number | null;
  refund_status?: string | null;
  refund_error?: string | null;

  reject_reason?: string | null;

  approved_at_ts?: number | null;
  approved_by?: string | null;

  rejected_at_ts?: number | null;
  rejected_by?: string | null;

  refunded_at_ts?: number | null;
  refunded_by?: string | null;
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

type ReturnAttachmentRow = {
  id: number;
  return_id: number;
  r2_key: string;
  original_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at_ts: number | null;
};

type AttachmentRow = {
  id: number;
  return_id: number;
  r2_key: string;
  original_name?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  created_at_ts?: number | null;
  raw_url: string; // ✅ 关键：走 Next proxy，避免跨域/cookie 问题
};

type AttachmentsApiCompat = {
  ok: boolean;
  return_id?: number;
  // worker 可能返回 attachments
  attachments?: ReturnAttachmentRow[];
  // 你之前的预期结构可能是 files
  count?: number;
  files?: AttachmentRow[];
  error?: string;
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

type UiNotice = {
  variant: "error" | "success" | "warning" | "info";
  message: string;
};

function prettifyErrorMessage(raw: string) {
  const s = (raw || "").trim();
  const lower = s.toLowerCase();
  if (!s) return "";

  if (lower === "unauthorized" || lower === "http_401") {
    return "Admin session expired. Please sign in again.";
  }
  if (lower === "not_found" || lower === "http_404") {
    return "This return request does not exist.";
  }
  if (lower === "bad_payload") {
    return "Server returned an unexpected response. Please try again.";
  }

  const m1 = s.match(/^failed\s*\((\d{3})\)$/i);
  if (m1?.[1]) return `Request failed (${m1[1]}). Please try again.`;

  const m2 = s.match(/^http_(\d{3})$/i);
  if (m2?.[1]) return `Request failed (${m2[1]}). Please try again.`;

  return s;
}

export default function ReturnDetailClient({ id }: { id: string }) {
  const numericId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ApiPayload | null>(null);

  const [rejectReason, setRejectReason] = useState<string>("");
  const [saving, setSaving] = useState<null | "approve" | "reject">(null);

  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [attachmentsErr, setAttachmentsErr] = useState<string>("");
  const [attachmentsLoading, setAttachmentsLoading] = useState<boolean>(false);

  const [notice, setNotice] = useState<UiNotice | null>(null);

  async function loadDetail(signal?: AbortSignal) {
    const r = await fetch(`/api/admin/returns/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal,
    });

    if (r.status === 401) throw new Error("UNAUTHORIZED");

    const j = (await r.json().catch(() => null)) as ApiPayload | null;

    if (r.status === 404 || j?.error === "NOT_FOUND" || j?.error === "not_found") {
      setData({ ok: true, return: undefined, items: [] });
      return { ok: true, return: undefined, items: [] } as ApiPayload;
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

  // ✅ 改：走 Next API proxy
  async function loadAttachments(returnId: number, signal?: AbortSignal) {
    setAttachmentsLoading(true);
    setAttachmentsErr("");

    try {
      const r = await fetch(`/api/admin/returns/${returnId}/attachments`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        signal,
      });

      if (r.status === 401) throw new Error("UNAUTHORIZED");

      const j = (await r.json().catch(() => null)) as AttachmentsApiCompat | null;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP_${r.status}`);
      }

      // 兼容两种返回结构：
      // - worker 现在返回 { attachments: [...] }
      // - 你旧预期返回 { files: [...] }
      const listA = Array.isArray(j.files) ? j.files : [];
      const listB = Array.isArray(j.attachments) ? j.attachments : [];

      const files: AttachmentRow[] =
        listA.length > 0
          ? listA.map((x) => ({
              ...x,
              raw_url:
                x.raw_url ||
                `/api/admin/returns/${returnId}/attachments/${encodeURIComponent(
                  String(x.id)
                )}`,
            }))
          : listB.map((x) => ({
              id: Number(x.id),
              return_id: Number(x.return_id),
              r2_key: String(x.r2_key || ""),
              original_name: x.original_name ?? null,
              content_type: x.content_type ?? null,
              size_bytes: x.size_bytes ?? null,
              created_at_ts: x.created_at_ts ?? null,
              raw_url: `/api/admin/returns/${returnId}/attachments/${encodeURIComponent(
                String(x.id)
              )}`,
            }));

      setAttachments(files);
      return files;
    } catch (e: any) {
      const msg = String(e?.message || e);
      setAttachments([]);
      setAttachmentsErr(msg);
      return [];
    } finally {
      setAttachmentsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    async function boot() {
      setLoading(true);
      setErr("");
      setData(null);
      setAttachments([]);
      setAttachmentsErr("");
      setAttachmentsLoading(false);
      setNotice(null);

      if (!Number.isFinite(numericId)) {
        setLoading(false);
        setErr("INVALID_ID");
        setNotice({ variant: "error", message: "Invalid return id." });
        return;
      }

      try {
        const detail = await loadDetail(ctrl.signal);

        const rid = Number(detail?.return?.id);
        if (Number.isFinite(rid) && rid > 0) {
          await loadAttachments(rid, ctrl.signal);
        } else {
          setAttachments([]);
        }
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (!cancelled) {
          setErr(msg);
          const pretty = prettifyErrorMessage(msg);
          const isNotFound =
            msg === "NOT_FOUND" || msg === "not_found" || msg === "HTTP_404";
          setNotice({
            variant:
              msg === "UNAUTHORIZED" || msg === "HTTP_401"
                ? "warning"
                : isNotFound
                  ? "info"
                  : "error",
            message: isNotFound
              ? "No return data found for this id."
              : pretty || "Failed to load return detail.",
          });
        }
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
  const isRefunded = statusLower === "refunded";

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Loading...</h2>
        <p className="text-sm text-slate-600">Fetching return #{id}</p>
      </div>
    );
  }

  if (!record) {
    const pretty =
      err === "not_found" || err === "HTTP_404"
        ? "NOT_FOUND"
        : err === "UNAUTHORIZED" || err === "HTTP_401"
          ? "UNAUTHORIZED"
          : err || "UNKNOWN_ERROR";

    const title = pretty === "UNAUTHORIZED" ? "Admin login required" : "No return data";
    const desc =
      pretty === "UNAUTHORIZED"
        ? "You are not logged in as admin. Please sign in to continue."
        : `No return request exists for this id (id: ${id}).`;

    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-slate-600">{desc}</p>

        <Alert
          variant={
            pretty === "UNAUTHORIZED" ? "warning" : pretty === "NOT_FOUND" ? "info" : "error"
          }
          className="border p-3 text-sm"
        >
          {pretty === "UNAUTHORIZED"
            ? "Admin session expired. Please sign in again."
            : pretty === "NOT_FOUND"
              ? "No data for this return id."
              : `Error: ${pretty}`}
        </Alert>

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
    const rec = record;
    if (!rec) {
      setNotice({ variant: "error", message: "Return record not loaded." });
      return;
    }

    setNotice(null);
    setSaving("approve");

    try {
      const r = await fetch(`/api/admin/returns/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({
          approved_amount_minor: rec.requested_amount_minor ?? null,
          currency: rec.currency ?? null,
        }),
      });

      const j = (await r.json().catch(() => null)) as any;

      if (r.status === 401) throw new Error("UNAUTHORIZED");
      if (!r.ok) throw new Error(j?.error || `HTTP_${r.status}`);

      setRejectReason("");
      setNotice({ variant: "success", message: "Approved." });
      await loadDetail();
    } catch (e: any) {
      const msg = String(e?.message || e);
      const pretty = prettifyErrorMessage(msg);
      setNotice({
        variant: msg === "UNAUTHORIZED" || msg === "HTTP_401" ? "warning" : "error",
        message:
          msg === "UNAUTHORIZED" || msg === "HTTP_401"
            ? "Admin session expired. Please sign in again."
            : `Approve failed: ${pretty || msg}`,
      });
    } finally {
      setSaving(null);
    }
  }

  async function onReject() {
    const rec = record;
    if (!rec) {
      setNotice({ variant: "error", message: "Return record not loaded." });
      return;
    }

    const rr = rejectReason.trim();
    if (!rr) {
      setNotice({ variant: "warning", message: "Reject reason is required." });
      return;
    }

    setNotice(null);
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
      if (!r.ok) throw new Error(j?.error || `HTTP_${r.status}`);

      setRejectReason("");
      setNotice({ variant: "success", message: "Rejected." });
      await loadDetail();
    } catch (e: any) {
      const msg = String(e?.message || e);
      const pretty = prettifyErrorMessage(msg);
      setNotice({
        variant: msg === "UNAUTHORIZED" || msg === "HTTP_401" ? "warning" : "error",
        message:
          msg === "UNAUTHORIZED" || msg === "HTTP_401"
            ? "Admin session expired. Please sign in again."
            : `Reject failed: ${pretty || msg}`,
      });
    } finally {
      setSaving(null);
    }
  }

  function formatMoney(minor?: number | null, currency?: string | null) {
    if (typeof minor !== "number") return "N/A";
    return `${(minor / 100).toFixed(2)}${currency ? ` ${currency}` : ""}`;
  }

  const requestedAmountText = formatMoney(
    record?.requested_amount_minor,
    record?.currency
  );

  const itemsAmountText = formatMoney(
    record?.items_amount_minor,
    record?.currency
  );

  const deliveryFeeText = formatMoney(
    record?.delivery_fee_minor,
    record?.currency
  );

  const approvedAmountText = formatMoney(
    record?.approved_amount_minor,
    record?.currency
  );

  const refundedAmountText = formatMoney(
    record?.refunded_amount_minor,
    record?.currency
  );

  const hasApprovedAmount = typeof record?.approved_amount_minor === "number";
  const hasRefundedAmount = typeof record?.refunded_amount_minor === "number";
  const hasRequestedAmount = typeof record?.requested_amount_minor === "number";
  const hasDeliveryFee = typeof record?.delivery_fee_minor === "number";
  const hasItemsAmount = typeof record?.items_amount_minor === "number";
  const hasRefundError = Boolean(record?.refund_error);

  return (
    <div className="space-y-6">
      {notice ? (
        <div>
          <Alert variant={notice.variant} className="border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{notice.message}</span>
              {notice.variant === "warning" &&
              notice.message.toLowerCase().includes("sign in") ? (
                <Link
                  href="/admin/login"
                  className="shrink-0 rounded-md bg-black px-3 py-2 text-sm text-white"
                >
                  Login
                </Link>
              ) : null}
            </div>
          </Alert>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-sm text-slate-500">
          <BackButton
            fallbackHref="/admin/returns"
            fallbackLabel="Returns"
            className="text-slate-500 hover:text-slate-900"
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight">
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

          <div className="shrink-0 pt-0.5">
            <StatusPill value={record.status || "unknown"} />
          </div>
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
              <div>
                <span className="text-slate-500">Approved amount:</span>{" "}
                <span className="font-mono">{approvedAmountText}</span>
              </div>
            </div>
          ) : null}

          {isRefunded ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Status:</span>{" "}
                <span className="font-medium text-green-700">Refunded</span>
              </div>
              <div>
                <span className="text-slate-500">Approved by:</span>{" "}
                <span className="font-mono">{record.approved_by || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500">Approved at:</span>{" "}
                <span className="font-mono">
                  {record.approved_at_ts ? toLocalTime(record.approved_at_ts) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Refunded by:</span>{" "}
                <span className="font-mono">{record.refunded_by || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500">Refunded at:</span>{" "}
                <span className="font-mono">
                  {record.refunded_at_ts ? toLocalTime(record.refunded_at_ts) : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Refunded amount:</span>{" "}
                <span className="font-mono">{refundedAmountText}</span>
              </div>

              {record.refund_status ? (
                <div>
                  <span className="text-slate-500">Refund status:</span>{" "}
                  <span className="font-mono">{record.refund_status}</span>
                </div>
              ) : null}

              {hasRefundError ? (
                <div>
                  <span className="text-slate-500">Refund error:</span>{" "}
                  <span className="font-mono break-all text-red-600">
                    {record.refund_error}
                  </span>
                </div>
              ) : null}
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
        <div className="text-sm font-medium text-slate-900">Refund amount</div>

        {/* 第一层：申请退款组成 */}
        <div className="mt-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Requested refund breakdown
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div className="rounded-md bg-slate-50 px-3 py-3">
              <div className="text-xs text-slate-500">Items subtotal</div>
              <div className="mt-1 font-mono text-sm text-slate-900">
                {hasItemsAmount ? itemsAmountText : "N/A"}
              </div>
            </div>

            <div className="rounded-md bg-slate-50 px-3 py-3">
              <div className="text-xs text-slate-500">Delivery fee</div>
              <div className="mt-1 font-mono text-sm text-slate-900">
                {hasDeliveryFee ? deliveryFeeText : "N/A"}
              </div>
            </div>

            <div className="rounded-md bg-slate-50 px-3 py-3">
              <div className="text-xs text-slate-500">Requested refund</div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {hasRequestedAmount ? requestedAmountText : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* 第二层：审批 / 实际退款 */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Decision and payout
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div className="rounded-md bg-slate-50 px-3 py-3">
              <div className="text-xs text-slate-500">Approved refund</div>
              <div className="mt-1 font-mono text-sm text-slate-900">
                {hasApprovedAmount ? approvedAmountText : "N/A"}
              </div>
            </div>

            <div className="rounded-md bg-slate-50 px-3 py-3">
              <div className="text-xs text-slate-500">Refunded amount</div>
              <div className="mt-1 font-mono text-sm text-slate-900">
                {hasRefundedAmount ? refundedAmountText : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {!hasRequestedAmount && !hasApprovedAmount && !hasRefundedAmount ? (
          <div className="mt-3 text-xs text-slate-500">
            No refund amount has been recorded yet.
          </div>
        ) : null}
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-900">Attachments</div>
          {attachmentsLoading ? (
            <div className="text-xs text-slate-500">Loading images...</div>
          ) : (
            <div className="text-xs text-slate-500">
              {attachments.length ? `${attachments.length} file(s)` : "No files"}
            </div>
          )}
        </div>

        {attachmentsErr ? (
          <div className="mt-2">
            <Alert variant="error" className="border p-3 text-sm">
              Failed to load attachments: {prettifyErrorMessage(attachmentsErr)}
            </Alert>
          </div>
        ) : null}

        {!attachmentsLoading && attachments.length === 0 && !attachmentsErr ? (
          <div className="mt-2 text-sm text-slate-600">No images uploaded.</div>
        ) : null}

        {attachments.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {attachments.map((f) => (
              <a
                key={f.id}
                href={f.raw_url}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-md border bg-slate-50"
                title={f.original_name || ""}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.raw_url}
                  alt={f.original_name || "attachment"}
                  className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="truncate px-2 py-1 text-xs text-slate-600">
                  {f.original_name || f.r2_key}
                </div>
              </a>
            ))}
          </div>
        ) : null}
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
                        order_item_id:{" "}
                        <span className="font-mono">{it.order_item_id}</span>
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
            {/* 左：Approve */}
            <div className="space-y-3">
              <button
                onClick={onApprove}
                disabled={saving !== null || typeof record.requested_amount_minor !== "number"}
                className="inline-flex min-h-[40px] min-w-[110px] items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving === "approve" ? "Approving..." : "Approve"}
              </button>
            </div>

            {/* 右：Reject */}
            <div className="space-y-3">
              <button
                onClick={onReject}
                disabled={saving !== null}
                className="inline-flex min-h-[40px] min-w-[110px] items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 disabled:opacity-60"
              >
                {saving === "reject" ? "Rejecting..." : "Reject"}
              </button>

              <div className="text-sm text-slate-600">Reason for rejection</div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[120px] w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Enter the rejection reason..."
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}