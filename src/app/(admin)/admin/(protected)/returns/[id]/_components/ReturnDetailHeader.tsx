// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnDetailHeader.tsx

import BackButton from "@/components/navigation/BackButton";
import type { ReturnRow } from "../return-detail.types";
import StatusPill from "./StatusPill";

export default function ReturnDetailHeader({ record }: { record: ReturnRow }) {
  return (
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
  );
}