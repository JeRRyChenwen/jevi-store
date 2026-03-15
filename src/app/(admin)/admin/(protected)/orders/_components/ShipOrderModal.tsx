// src/app/(admin)/admin/(protected)/orders/_components/ShipOrderModal.tsx

import type { ApiOrderRow } from "../orders.types";

type ShipOrderModalProps = {
  open: boolean;
  order: ApiOrderRow | null;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  submitting: boolean;
  canShip: boolean;
  onClose: () => void;
  onSubmit: () => void;
  setCarrier: (v: string) => void;
  setTrackingNumber: (v: string) => void;
  setTrackingUrl: (v: string) => void;
};

export default function ShipOrderModal({
  open,
  order,
  carrier,
  trackingNumber,
  trackingUrl,
  submitting,
  canShip,
  onClose,
  onSubmit,
  setCarrier,
  setTrackingNumber,
  setTrackingUrl,
}: ShipOrderModalProps) {
  if (!open || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Mark shipped</div>
            <div className="mt-1 text-xs text-slate-600">
              Order:{" "}
              <span className="font-mono">
                {order.order_number || `#${order.id}`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-md border bg-white px-2 py-1 text-sm hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500">Carrier (optional)</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="auspost / dhl / ups"
              className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Tracking number (required)</label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. TEST123456AU"
              className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Tracking link (optional)</label>
            <input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              onClick={onSubmit}
              disabled={!canShip || submitting}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Confirm shipped"}
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Note: Shipment email is sent by worker cron after status becomes shipped.
          </div>
        </div>
      </div>
    </div>
  );
}