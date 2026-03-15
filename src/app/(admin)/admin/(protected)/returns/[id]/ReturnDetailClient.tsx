// src/app/(admin)/admin/(protected)/returns/[id]/ReturnDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";

import type {
  ApiPayload,
  AttachmentRow,
  AttachmentsApiCompat,
  UiNotice,
} from "./return-detail.types";

import {
  formatMoney,
  getRejectReasonLabel,
  prettifyErrorMessage,
} from "./return-detail.utils";

import ReturnDetailHeader from "./_components/ReturnDetailHeader";
import ReturnDecisionCard from "./_components/ReturnDecisionCard";
import ReturnRefundAmountCard from "./_components/ReturnRefundAmountCard";
import ReturnReasonCard from "./_components/ReturnReasonCard";
import ReturnAttachmentsCard from "./_components/ReturnAttachmentsCard";
import ReturnItemsCard from "./_components/ReturnItemsCard";
import ReturnActionsCard from "./_components/ReturnActionsCard";

export default function ReturnDetailClient({ id }: { id: string }) {
  const numericId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<ApiPayload | null>(null);

  const [rejectReasonCode, setRejectReasonCode] = useState<string>("");
  const [rejectReasonText, setRejectReasonText] = useState<string>("");
  const [isReasonMenuOpen, setIsReasonMenuOpen] = useState(false);
  const [saving, setSaving] = useState<null | "approve" | "reject">(null);

  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [attachmentsErr, setAttachmentsErr] = useState<string>("");
  const [attachmentsLoading, setAttachmentsLoading] = useState<boolean>(false);

  const [notice, setNotice] = useState<UiNotice | null>(null);

  const selectedRejectReasonLabel = useMemo(() => {
    return rejectReasonCode
      ? getRejectReasonLabel(rejectReasonCode)
      : "请选择主原因 / Select a main reason";
  }, [rejectReasonCode]);

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

      setRejectReasonCode("");
      setRejectReasonText("");
      setIsReasonMenuOpen(false);
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

    const code = rejectReasonCode.trim();
    const text = rejectReasonText.trim();

    if (!code) {
      setNotice({ variant: "warning", message: "Main reject reason is required." });
      return;
    }

    if (!text) {
      setNotice({ variant: "warning", message: "Reject reason detail is required." });
      return;
    }

    if (code === "other" && text.length < 8) {
      setNotice({
        variant: "warning",
        message: "Please provide a more detailed explanation for 'Other'.",
      });
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
        body: JSON.stringify({
          reject_reason_code: code,
          reject_reason_text: text,
          reject_reason: text,
        }),
      });

      const j = (await r.json().catch(() => null)) as any;

      if (r.status === 401) throw new Error("UNAUTHORIZED");
      if (!r.ok) throw new Error(j?.error || `HTTP_${r.status}`);

      setRejectReasonCode("");
      setRejectReasonText("");
      setIsReasonMenuOpen(false);
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

      <ReturnDetailHeader record={record} />

      <ReturnDecisionCard
        record={record}
        isPending={isPending}
        isApproved={isApproved}
        isRejected={isRejected}
        isRefunded={isRefunded}
        approvedAmountText={approvedAmountText}
        refundedAmountText={refundedAmountText}
        hasRefundError={hasRefundError}
      />

      <ReturnRefundAmountCard
        hasItemsAmount={hasItemsAmount}
        itemsAmountText={itemsAmountText}
        hasDeliveryFee={hasDeliveryFee}
        deliveryFeeText={deliveryFeeText}
        hasRequestedAmount={hasRequestedAmount}
        requestedAmountText={requestedAmountText}
        hasApprovedAmount={hasApprovedAmount}
        approvedAmountText={approvedAmountText}
        hasRefundedAmount={hasRefundedAmount}
        refundedAmountText={refundedAmountText}
      />

      <ReturnReasonCard record={record} />

      <ReturnAttachmentsCard
        attachments={attachments}
        attachmentsLoading={attachmentsLoading}
        attachmentsErr={attachmentsErr}
      />

      <ReturnItemsCard items={items} />

      <ReturnActionsCard
        isPending={isPending}
        saving={saving}
        hasRequestedAmount={hasRequestedAmount}
        requestedAmountText={requestedAmountText}
        requestedAmountMinor={record.requested_amount_minor}
        rejectReasonCode={rejectReasonCode}
        rejectReasonText={rejectReasonText}
        isReasonMenuOpen={isReasonMenuOpen}
        selectedRejectReasonLabel={selectedRejectReasonLabel}
        setRejectReasonCode={setRejectReasonCode}
        setRejectReasonText={setRejectReasonText}
        setIsReasonMenuOpen={setIsReasonMenuOpen}
        onApprove={onApprove}
        onReject={onReject}
      />
    </div>
  );
}