// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnDecisionCard.tsx

import type { ReturnRow } from "../return-detail.types";
import { getRejectReasonLabel, toLocalTime } from "../return-detail.utils";

type Props = {
  record: ReturnRow;
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isRefunded: boolean;
  approvedAmountText: string;
  refundedAmountText: string;
  hasRefundError: boolean;
};

export default function ReturnDecisionCard({
  record,
  isPending,
  isApproved,
  isRejected,
  isRefunded,
  approvedAmountText,
  refundedAmountText,
  hasRefundError,
}: Props) {
  if (isPending) return null;

  return (
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
        <div className="mt-2 space-y-3 text-sm text-slate-700">
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

          <div className="rounded-md border border-red-100 bg-red-50 px-3 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-red-700">
              Rejection reason
            </div>

            <div className="mt-2">
              <div className="text-xs text-slate-500">Main reason</div>
              <div className="mt-1 font-mono text-sm text-slate-900">
                {getRejectReasonLabel(record.reject_reason_code)}
              </div>
            </div>

            <div className="mt-3 border-t border-red-100 pt-3">
              <div className="text-xs text-slate-500">Reason details</div>
              <div className="mt-1 whitespace-pre-wrap font-mono text-sm text-slate-900">
                {record.reject_reason_text || record.reject_reason || "-"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}