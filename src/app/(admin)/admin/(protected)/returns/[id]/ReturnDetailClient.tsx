// src/app/(admin)/admin/(protected)/returns/[id]/ReturnDetailClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ApiPayload,
  AttachmentRow,
  AttachmentsApiCompat,
  UiNotice,
} from "./return-detail.types";

import {
  getRejectReasonLabel,
  prettifyErrorMessage,
} from "./return-detail.utils";

import { buildReturnDetailViewModel } from "./return-detail.viewmodel";

import ReturnDetailLoading from "./_components/ReturnDetailLoading";
import ReturnDetailEmptyState from "./_components/ReturnDetailEmptyState";
import ReturnNoticeBanner from "./_components/ReturnNoticeBanner";
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

  const {
    isPending,
    isApproved,
    isRejected,
    isRefunded,

    requestedAmountText,
    itemsAmountText,
    deliveryFeeText,
    approvedAmountText,
    refundedAmountText,

    hasApprovedAmount,
    hasRefundedAmount,
    hasRequestedAmount,
    hasDeliveryFee,
    hasItemsAmount,
    hasRefundError,
  } = buildReturnDetailViewModel(record);

  if (loading) {
    return <ReturnDetailLoading id={id} />;
  }

  if (!record) {
    return <ReturnDetailEmptyState id={id} err={err} />;
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
          reject_reason_text: text || null,
          reject_reason: text || null,
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

  return (
    <div className="space-y-6">
      <ReturnNoticeBanner notice={notice} />

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