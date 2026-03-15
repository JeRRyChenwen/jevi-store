// src/app/(admin)/admin/(protected)/orders/_components/OrdersTable.tsx

import type { ApiOrderRow } from "../orders.types";
import { money, fmtWhen } from "../orders.utils";
import StatusPill from "./StatusPill";

type OrdersTableProps = {
  loading: boolean;
  rows: ApiOrderRow[];
  actionBtnBase: string;
  actionBtnWidth: string;
  onOpenShip: (order: ApiOrderRow) => void;
};

export default function OrdersTable({
  loading,
  rows,
  actionBtnBase,
  actionBtnWidth,
  onOpenShip,
}: OrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs text-slate-600">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Order number</th>
            <th className="px-4 py-3">Customer name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Created at</th>
            <th className="px-4 py-3">Shipped</th>
            <th className="px-4 py-3">Tracking</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-4 text-slate-500" colSpan={10}>
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-slate-500" colSpan={10}>
                No orders.
              </td>
            </tr>
          ) : (
            rows.map((o) => {
              const fullName = `${o.first_name || ""} ${o.last_name || ""}`.trim() || "—";
              const st = String(o.status || "").toLowerCase();
              const isShipped = st === "shipped";
              const totalText = money(o.grand_total_minor ?? 0, o.currency ?? "AUD");

              const createdText = fmtWhen(o.created_at_cn, o.created_at_ts);
              const shippedText = fmtWhen(o.shipped_at_cn, o.shipped_at_ts);

              return (
                <tr key={o.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-mono">{o.id}</td>
                  <td className="px-4 py-3 font-mono">{o.order_number || "—"}</td>
                  <td className="px-4 py-3">{fullName}</td>
                  <td className="px-4 py-3">{o.email || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill value={st} />
                  </td>
                  <td className="px-4 py-3">{totalText}</td>
                  <td className="px-4 py-3 text-slate-600">{createdText}</td>
                  <td className="px-4 py-3 text-slate-600">{shippedText}</td>
                  <td className="px-4 py-3">
                    {o.tracking_number ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs">{o.tracking_number}</span>
                        {o.tracking_url ? (
                          <a
                            className="text-blue-600 hover:underline text-xs"
                            href={o.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Track
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onOpenShip(o)}
                      disabled={isShipped}
                      className={[
                        actionBtnBase,
                        actionBtnWidth,
                        isShipped
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-900 text-white hover:bg-slate-800",
                      ].join(" ")}
                    >
                      {isShipped ? "Shipped" : "Mark shipped"}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}