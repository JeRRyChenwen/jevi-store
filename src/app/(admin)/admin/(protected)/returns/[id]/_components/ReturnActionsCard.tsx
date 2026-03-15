// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnActionsCard.tsx

import { REJECT_REASON_GROUPS } from "../return-detail.utils";

type Props = {
  isPending: boolean;
  saving: null | "approve" | "reject";

  hasRequestedAmount: boolean;
  requestedAmountText: string;
  requestedAmountMinor?: number | null;

  rejectReasonCode: string;
  rejectReasonText: string;
  isReasonMenuOpen: boolean;
  selectedRejectReasonLabel: string;

  setRejectReasonCode: (value: string) => void;
  setRejectReasonText: (value: string) => void;
  setIsReasonMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void;

  onApprove: () => void;
  onReject: () => void;
};

export default function ReturnActionsCard({
  isPending,
  saving,
  hasRequestedAmount,
  requestedAmountText,
  requestedAmountMinor,
  rejectReasonCode,
  rejectReasonText,
  isReasonMenuOpen,
  selectedRejectReasonLabel,
  setRejectReasonCode,
  setRejectReasonText,
  setIsReasonMenuOpen,
  onApprove,
  onReject,
}: Props) {
  if (!isPending) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-900">Actions</div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex min-h-[300px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-medium text-slate-900">
                批准退货 / Approve return
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                审核通过后，系统会按当前申请退款金额进行批准，并进入后续退款流程。
                <br />
                Once approved, the return request will be accepted using the
                currently requested refund amount and will move into the next refund
                stage.
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-3">
                <div className="text-xs text-slate-500">Requested refund</div>
                <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {hasRequestedAmount ? requestedAmountText : "N/A"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={onApprove}
                disabled={saving !== null || typeof requestedAmountMinor !== "number"}
                className="inline-flex min-h-[40px] min-w-[110px] items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving === "approve" ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="min-h-[300px] rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <div className="text-sm font-medium text-slate-900">
                拒绝退货 / Reject return
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                请选择一个标准化主原因，并补充详细说明。后续拒绝邮件中可展示主原因和原因详情。
                <br />
                Please choose a standardised main reason and provide a detailed
                explanation. The rejection email may display both the main reason
                and the detailed explanation.
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-900">
                主原因 / Main reason
              </label>

              <div className="relative">
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => setIsReasonMenuOpen((v) => !v)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 disabled:opacity-60"
                >
                  <span className={rejectReasonCode ? "text-slate-900" : "text-slate-500"}>
                    {selectedRejectReasonLabel}
                  </span>
                  <span className="ml-3 text-slate-400">
                    {isReasonMenuOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isReasonMenuOpen ? (
                  <div className="absolute z-20 mt-2 max-h-[360px] w-full overflow-y-auto rounded-md border border-slate-900 bg-white shadow-lg">
                    <div className="sticky top-0 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                      请选择主原因 / Select a main reason
                    </div>

                    <div className="p-2">
                      {REJECT_REASON_GROUPS.map((group) => (
                        <div key={group.label} className="mb-3 last:mb-0">
                          <div className="rounded-md border border-slate-300 bg-slate-200 px-3 py-2 text-xs font-bold tracking-wide text-slate-800 shadow-sm">
                            {group.label}
                          </div>

                          <div className="mt-1 space-y-1">
                            {group.options.map((opt) => {
                              const isActive = rejectReasonCode === opt.value;

                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setRejectReasonCode(opt.value);
                                    setIsReasonMenuOpen(false);
                                  }}
                                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                                    isActive
                                      ? "bg-slate-900 text-white"
                                      : "text-slate-800 hover:bg-slate-100"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">
                拒绝原因详情 / Reason for rejection
              </label>
              <textarea
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                disabled={saving !== null}
                className="min-h-[180px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
                placeholder="请输入会展示给客户的详细说明 / Enter the detailed explanation that may be shown in the rejection email..."
              />
              <div className="mt-2 text-xs leading-5 text-slate-500">
                这段详细说明后续可能会展示在客户收到的拒绝退货邮件中。 / This
                detailed message may be shown to the customer in the rejection
                email.
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={onReject}
                disabled={saving !== null}
                className="inline-flex min-h-[40px] min-w-[110px] items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 disabled:opacity-60"
              >
                {saving === "reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}