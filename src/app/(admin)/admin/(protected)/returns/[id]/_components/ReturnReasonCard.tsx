// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnReasonCard.tsx

import type { ReturnRow } from "../return-detail.types";
import { getReasonLabel } from "../return-detail.utils";

export default function ReturnReasonCard({ record }: { record: ReturnRow }) {
  return (
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
  );
}