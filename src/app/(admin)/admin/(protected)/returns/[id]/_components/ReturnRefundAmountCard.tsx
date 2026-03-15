// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnRefundAmountCard.tsx

type Props = {
  hasItemsAmount: boolean;
  itemsAmountText: string;
  hasDeliveryFee: boolean;
  deliveryFeeText: string;
  hasRequestedAmount: boolean;
  requestedAmountText: string;
  hasApprovedAmount: boolean;
  approvedAmountText: string;
  hasRefundedAmount: boolean;
  refundedAmountText: string;
};

export default function ReturnRefundAmountCard({
  hasItemsAmount,
  itemsAmountText,
  hasDeliveryFee,
  deliveryFeeText,
  hasRequestedAmount,
  requestedAmountText,
  hasApprovedAmount,
  approvedAmountText,
  hasRefundedAmount,
  refundedAmountText,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-900">Refund amount</div>

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
  );
}