// src/app/(admin)/admin/(protected)/returns/[id]/_components/ReturnItemsCard.tsx

import type { ReturnItemRow } from "../return-detail.types";

export default function ReturnItemsCard({ items }: { items: ReturnItemRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-900">Items</div>

      {items.length === 0 ? (
        <div className="mt-2 text-sm text-slate-600">No items.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((it) => {
            const title = it.product_title || `Item #${it.order_item_id}`;

            const parts: string[] = [];
            if (it.variant_title) {
              parts.push(it.variant_title);
            } else {
              if (it.size) parts.push(`Size: ${it.size}`);
              if (it.color) parts.push(`Color: ${it.color}`);
            }
            if (it.variant_sku) parts.push(`SKU: ${it.variant_sku}`);

            const meta = parts.filter(Boolean).join(" · ");

            return (
              <div
                key={it.id}
                className="flex items-start justify-between gap-4 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{title}</div>

                  {meta ? (
                    <div className="mt-0.5 text-xs text-slate-500">{meta}</div>
                  ) : (
                    <div className="mt-0.5 text-xs text-slate-500">
                      order_item_id:{" "}
                      <span className="font-mono">{it.order_item_id}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-slate-700">
                  qty: <span className="font-mono">{it.qty}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}