// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnAttachmentsCard.tsx

import { Alert } from "@/components/ui/alert";
import type { AttachmentRow } from "../return-detail.types";
import { prettifyErrorMessage } from "../return-detail.utils";

type Props = {
  attachments: AttachmentRow[];
  attachmentsLoading: boolean;
  attachmentsErr: string;
};

export default function ReturnAttachmentsCard({
  attachments,
  attachmentsLoading,
  attachmentsErr,
}: Props) {
  return (
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
  );
}